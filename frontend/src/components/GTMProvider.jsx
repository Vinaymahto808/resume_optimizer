import { useGTMPageView } from "../hooks/useGTM";

export default function GTMProvider({ children }) {
  useGTMPageView();
  return children;
}
