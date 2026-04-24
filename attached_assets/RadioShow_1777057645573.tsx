import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPodcast } from "@fortawesome/free-solid-svg-icons";

export default function RadioShow() {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">Radio Mixes</h2>
        <motion.a 
          href="#"
          whileHover={{ scale: 1.05 }}
          className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faPodcast} />
          All Episodes
        </motion.a>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative group h-80 rounded-[2rem] overflow-hidden border border-outline/5 shadow-2xl"
      >
        <img 
          alt="Radio Show" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqdWzLSx6CLpmKgbzaFfy-WZnFMQiyL_X7YmHx8wnM6Z2cEpuqz1aFI0MA1Wsh_v4Qjamu28Iamh0b0G6z_ChK_8Z-L0xIWSLjT8zQ_uT3IB4uEBTzQMPvn9gomE2TRH2dttEt-VnDhnQ4IkKTbEyf9KTNds7tQOC_011jwHbl1LuHgtiXGaVYYW7ctpoBFVT2hqgv6U53Vcg59MgzaCGUg9lyfNLuVDIfb9oQCD5gsKYaNFPR1jn1hWO4jdxSNuRGcMFyAPRHieU"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        
        <div className="absolute inset-0 p-10 flex flex-col justify-end space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
              <span className="text-secondary text-[10px] font-black uppercase tracking-[0.3em]">Latest Episode</span>
            </div>
            <h3 className="font-headline text-4xl font-black text-on-surface leading-none tracking-tighter">Beyond the Void<br/>Radio #042</h3>
            <p className="text-on-surface/60 text-xs font-medium max-w-[280px] leading-relaxed">Deep hypnotic techno and underground house curated by WES.</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 flex items-center justify-center bg-secondary text-on-secondary rounded-full shadow-xl shadow-secondary/20"
          >
            <FontAwesomeIcon icon={faPlay} className="text-lg ml-1" />
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}
