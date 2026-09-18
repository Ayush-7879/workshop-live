import React, { useState, useCallback } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Footer from "./components/Footer.jsx";
import Toast from "./components/Toast.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import WorkshopDetail from "./pages/WorkshopDetail.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import { useAuth } from "./context/AuthContext.jsx";

export default function App() {
const [toasts, setToasts] = useState([]);
const location = useLocation();
const { user } = useAuth();
const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
const showSidebar = !!user && !isAuthPage;

const addToast = useCallback((notif) => {
const id = Date.now() + Math.random();
setToasts((prev) => [...prev, { id, ...notif }]);
}, []);

const removeToast = useCallback((id) => {
setToasts((prev) => prev.filter((t) => t.id !== id));
}, []);

return (
<>
<Navbar onToast={addToast} />
<Toast toasts={toasts} removeToast={removeToast} />
<div className={isAuthPage ? "" : "app-shell"}>
{showSidebar && <Sidebar />}
<div className={isAuthPage ? "" : "container"}>
<Routes>
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route
path="/admin"
element={
<ProtectedRoute role="admin">
<AdminDashboard onToast={addToast} />
</ProtectedRoute>
}
/>
<Route
path="/student"
element={
<ProtectedRoute role="student">
<StudentDashboard onToast={addToast} />
</ProtectedRoute>
}
/>
<Route
path="/profile"
element={
<ProtectedRoute>
<ProfilePage />
</ProtectedRoute>
}
/>
<Route
path="/workshop/:id"
element={
<ProtectedRoute>
<WorkshopDetail />
</ProtectedRoute>
}
/>
</Routes>
</div>
</div>
{!isAuthPage && <Footer />}
</>
);
}
