import { RegisterScreen } from "@/components/auth/RegisterScreen";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
  const navigate = useNavigate();
  return <RegisterScreen 
    onGoToLogin={() => navigate('/login')}
  />;
};
export default RegisterPage;