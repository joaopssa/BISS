import { LoginScreen } from "@/components/auth/LoginScreen";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  return <LoginScreen onGoToRegister={() => navigate('/register')} />;
};
export default LoginPage;