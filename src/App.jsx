import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/common/PublicLayout.jsx'
import ProtectedRoute from './components/dashboard/ProtectedRoute.jsx'
import DashboardLayout from './components/dashboard/DashboardLayout.jsx'
import Home from './pages/public/Home.jsx'
import About from './pages/public/About.jsx'
import PublicServices from './pages/public/Services.jsx'
import Blog from './pages/public/Blog.jsx'
import BlogPost from './pages/public/BlogPost.jsx'
import Contact from './pages/public/Contact.jsx'
import Login from './pages/public/Login.jsx'
import Register from './pages/public/Register.jsx'
import NotFound from './pages/public/NotFound.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import Documents from './pages/dashboard/Documents.jsx'
import Appointments from './pages/dashboard/Appointments.jsx'
import DashboardServices from './pages/dashboard/Services.jsx'
import Payments from './pages/dashboard/Payments.jsx'
import Notifications from './pages/dashboard/Notifications.jsx'
import Profile from './pages/dashboard/Profile.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminDocuments from './pages/admin/Documents.jsx'
import AdminServices from './pages/admin/Services.jsx'
import AdminAppointments from './pages/admin/Appointments.jsx'
import AdminPayments from './pages/admin/Payments.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<PublicServices />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              <DashboardLayout role="user" />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="services" element={<DashboardServices />} />
          <Route path="payments" element={<Payments />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="payments" element={<AdminPayments />} />
        </Route>

        <Route path="home" element={<Navigate replace to="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
