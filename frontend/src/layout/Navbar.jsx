import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";

import {
  FiMenu,
  FiX,
  FiHome,
  FiGrid,
  FiInfo,
  FiPhone,
  FiLogOut
} from "react-icons/fi";

import useAuthStore from "../utils/authStore";

import "../assets/Navbar.css";

const Navbar = () => {

  const navigate = useNavigate();

  const [sidebar, setSidebar] = useState(false);

  const { logout, isLoading } = useAuthStore();

  // Toggle Sidebar
  const toggleSidebar = () => {
    setSidebar(!sidebar);
  };

  // Logout Function
  const handleLogout = async () => {

    const result = await logout();

    if (result.success) {

      toast.success("👋 Logged out successfully");

      navigate("/login");

    } else {

      toast.error(result.message || "Logout failed");

    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">

        <div className="nav-container">

          {/* Left Side */}
          <div className="nav-left">

            {/* Menu Button */}
            <button
              className="menu-btn"
              onClick={toggleSidebar}
            >
              {sidebar ? <FiX /> : <FiMenu />}
            </button>

            {/* Logo */}
            <Link to="/" className="logo">
              🤖 Project LOOP
            </Link>

          </div>

          {/* Right Side */}
          <div className="nav-auth">

            <button
              className="logout-btn"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <FiLogOut />

              {isLoading ? "Logging out..." : "Logout"}

            </button>

          </div>

        </div>

      </nav>

      {/* Sidebar */}
      <div className={`sidebar ${sidebar ? "active" : ""}`}>

        <NavLink
          to="/"
          className="sidebar-link"
          onClick={() => setSidebar(false)}
        >
          <FiHome />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/features"
          className="sidebar-link"
          onClick={() => setSidebar(false)}
        >
          <FiGrid />
          <span>Features</span>
        </NavLink>

        <NavLink
          to="/about"
          className="sidebar-link"
          onClick={() => setSidebar(false)}
        >
          <FiInfo />
          <span>About</span>
        </NavLink>

        <NavLink
          to="/contact"
          className="sidebar-link"
          onClick={() => setSidebar(false)}
        >
          <FiPhone />
          <span>Contact</span>
        </NavLink>

        {/* Sidebar Logout */}
        <button
          className="sidebar-logout"
          onClick={handleLogout}
          disabled={isLoading}
        >
          <FiLogOut />

          <span>
            {isLoading ? "Logging out..." : "Logout"}
          </span>

        </button>

      </div>

      {/* Overlay */}
      {sidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebar(false)}
        />
      )}
    </>
  );
};

export default Navbar;