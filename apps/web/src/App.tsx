/**
 * 应用根组件
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import AutoTasks from './pages/AutoTasks';
import ReAct from './pages/ReAct';
import Scheduler from './pages/Scheduler';
import Memory from './pages/Memory';
import Messaging from './pages/Messaging';
import Database from './pages/Database';
import Dashboard from './pages/Dashboard';

// 简单的路由守卫
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        }
      />
      <Route
        path="/auto-tasks"
        element={
          <PrivateRoute>
            <AutoTasks />
          </PrivateRoute>
        }
      />
      <Route
        path="/react"
        element={
          <PrivateRoute>
            <ReAct />
          </PrivateRoute>
        }
      />
      <Route
        path="/scheduler"
        element={
          <PrivateRoute>
            <Scheduler />
          </PrivateRoute>
        }
      />
      <Route
        path="/memory"
        element={
          <PrivateRoute>
            <Memory />
          </PrivateRoute>
        }
      />
      <Route
        path="/messaging"
        element={
          <PrivateRoute>
            <Messaging />
          </PrivateRoute>
        }
      />
      <Route
        path="/database"
        element={
          <PrivateRoute>
            <Database />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" />} />
    </Routes>
  );
}

export default App;
