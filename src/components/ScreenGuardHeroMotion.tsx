import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  src: string;
  alt: string;
}

export default function ScreenGuardHeroMotion({ src, alt }: Props) {
  const reducedMotion = useReducedMotion();
  const windowInitial = reducedMotion ? false : {
    clipPath: 'inset(10% 8% 10% 8% round 14px)',
    boxShadow: '0 8px 20px rgb(16 21 45 / 5%)'
  };
  const windowAnimate = {
    clipPath: 'inset(0 0 0 0 round 14px)',
    boxShadow: '0 24px 60px rgb(16 21 45 / 11%)'
  };

  return (
    <div className="sg-hero-visual">
      <motion.div
        className="sg-window"
        initial={windowInitial}
        animate={windowAnimate}
        transition={{ duration: reducedMotion ? 0 : 0.62, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sg-window-bar"><span></span><span></span><span></span><b>ScreenGuard for Chrome</b></div>
        <img src={src} alt={alt} width="1280" height="800" />
      </motion.div>
      <motion.div
        className="sg-status-card"
        initial={reducedMotion ? false : { opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.26, delay: reducedMotion ? 0 : 0.44, ease: [0.16, 1, 0.3, 1] }}
      >
        <i className="is-safe" aria-hidden="true"></i>
        <div><strong>Protection active</strong><small>Risk checks stay on your device</small></div>
      </motion.div>
    </div>
  );
}
