/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Hero from "./components/Hero";
import FeaturedSection from "./components/FeaturedSection";
import PopularTracks from "./components/PopularTracks";
import RadioShow from "./components/RadioShow";
import UpcomingShows from "./components/UpcomingShows";
import EmailCapture from "./components/EmailCapture";
import Footer from "./components/Footer";
import { motion, useScroll, useTransform } from "motion/react";
import { useState, useEffect } from "react";

const HERO_IMAGE = "https://image2url.com/r2/default/images/1774985821245-8821b2c4-f571-4c19-a33c-6fb9e05835f7.jpg";

const tabs = [
  { label: "Featured", href: "#featured" },
  { label: "Music", href: "#tracks" },
  { label: "Radio", href: "#radio" },
  { label: "Shows", href: "#shows" },
];

export default function App() {
  const { scrollY } = useScroll();
  const [activeTab, setActiveTab] = useState("Featured");
  
  // Logo transforms: start large and centered in hero, shrink and move to top
  const logoScale = useTransform(scrollY, [0, 400], [6, 1]);
  const logoY = useTransform(scrollY, [0, 400], [320, 0]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = tabs.map(tab => document.querySelector(tab.href));
      const scrollPosition = window.scrollY + 200;

      sections.forEach((section, index) => {
        if (section) {
          const top = (section as HTMLElement).offsetTop;
          const height = (section as HTMLElement).offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(tabs[index].label);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-on-background selection:bg-primary selection:text-on-primary">
      {/* Sticky Logo */}
      <motion.div 
        style={{ scale: logoScale, y: logoY }}
        className="fixed top-0 left-0 w-full z-50 flex flex-col items-center py-8 pointer-events-none"
      >
        <h1 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-headline text-4xl font-black tracking-tighter text-on-surface drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] pointer-events-auto cursor-pointer"
        >
          WES.
        </h1>
      </motion.div>

      <main className="relative z-10 pb-32 max-w-2xl mx-auto px-4 pt-10">
        <Hero imageUrl={HERO_IMAGE} />
        
        {/* Sticky Navigation Tabs */}
        <div className="sticky top-24 z-40 py-4 mb-12">
          <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline/10 p-1 rounded-full flex gap-1 shadow-2xl max-w-fit mx-auto">
            {tabs.map((tab) => (
              <a
                key={tab.label}
                href={tab.href}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.querySelector(tab.href);
                  if (element) {
                    const offset = 140;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = element.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth"
                    });
                  }
                }}
                className={`relative px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                  activeTab === tab.label ? "text-on-primary" : "text-on-surface/40 hover:text-on-surface"
                }`}
              >
                {activeTab === tab.label && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab.label}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-32">
          <section id="featured">
            <FeaturedSection />
          </section>

          <section id="tracks">
            <PopularTracks />
          </section>

          <section id="radio">
            <RadioShow />
          </section>

          <section id="shows">
            <UpcomingShows />
          </section>

          <EmailCapture />
        </div>
      </main>
      <Footer />
    </div>
  );
}
