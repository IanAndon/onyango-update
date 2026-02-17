import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onyango Construction | Sign In",
  description: "Sign in to Onyango Construction — Hardware, workshop & construction management.",
};

export default function SignIn() {
  return <SignInForm />;
}
