import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Contact, Features, Footer, HowItWorks } from "@/components/landing/Sections";
import { CoverageMap } from "@/components/landing/CoverageMap";

export default function LandingPage() {
  return (
    <main className="flex-1">
      <Navbar />
      <Hero />
      <Features />
      <CoverageMap />
      <HowItWorks />
      <Contact />
      <Footer />
    </main>
  );
}
