import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import {
  generateAccessToken,
  generateRefreshToken
} from '../utils/generateToken.js';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, workspaceName } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Create the user first (role defaults to 'analyst'; promoted to admin below)
    const user = await User.create({ name, email, password });

    // ─── Create the user's workspace and make them its admin (Day 3) ─────
    const workspace = await Workspace.create({
      name: workspaceName?.trim() || `${name.split(' ')[0]}'s Workspace`,
      owner: user._id,
    });

    user.workspaceId = workspace._id;
    user.role = 'admin';

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: '🎉 Account created successfully!',
      data: { user, workspace, accessToken, refreshToken }
    });

  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift(); // Remove oldest token
    }
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: '✅ Login successful',
      data: { user, accessToken, refreshToken }
    });

  } catch (error) {
    next(error);
  }
};

export const refreshUserToken  = async (req, res, next) => {
  try {

    const { refreshToken: incomingRefreshToken } = req.body;

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Make sure the user still exists and this refresh token is one we
    // actually issued (and haven't revoked via logout).
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === incomingRefreshToken
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }

    // Rotate: issue a new pair, drop the old refresh token
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== incomingRefreshToken
    );
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
    });

  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Remove this device's refresh token from DB
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token: refreshToken } }
    });

    res.json({
      success: true,
      message: '👋 Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
};

// PATCH /api/auth/change-password — requires the current password before
// allowing a new one. Works for any logged-in user, including a brand-new
// self-registered admin or someone using their invite temp password.
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are both required'
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // req.user (from protect middleware) has password excluded — re-fetch
    // this one field rather than loosening the schema's select:false default.
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from the current password'
      });
    }

    user.password = newPassword; // pre('save') hook hashes this automatically
    // Revoke all existing refresh tokens so other/old sessions can't keep
    // using the account under the old password's trust boundary.
    user.refreshTokens = [];
    await user.save();

    // Issue a fresh pair so the current session (the one that just proved
    // it knows the password) stays logged in without needing to re-auth.
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: '✅ Password changed successfully',
      data: { accessToken, refreshToken }
    });

  } catch (error) {
    next(error);
  }
};
