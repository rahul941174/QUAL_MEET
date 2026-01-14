import PublicLayout from "../../components/layout/PublicLayout";
import HeroSection from "./HeroSection";
import PreviewSection from "./PreviewSection";

export default function HomePage() {
  return (
    <PublicLayout>
      <HeroSection />
      <PreviewSection />
    </PublicLayout>
  );
}
