import { motion, useReducedMotion } from 'framer-motion';

const ASSETS = {
  happy: '/mascot/happy.jpg',
  thinking: '/mascot/thinking.jpg',
  focused: '/mascot/focused.jpg',
  celebrating: '/mascot/celebrating.jpg',
  reminder: '/mascot/reminder.jpg',
};

const SIZES = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-40 w-40',
  hero: 'h-56 w-56 sm:h-64 sm:w-64',
};

const ALT = {
  happy: 'LexBuddy the owl lawyer, smiling',
  thinking: 'LexBuddy thinking through the next step',
  focused: 'LexBuddy focused on the work',
  celebrating: 'LexBuddy celebrating a completed task',
  reminder: 'LexBuddy reminding you about an upcoming deadline',
};

export function LexBuddy({
  mood = 'happy',
  size = 'md',
  message,
  showMessage = false,
  animated = true,
  className = '',
}) {
  const reduce = useReducedMotion();
  const src = ASSETS[mood] || ASSETS.happy;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.img
        src={src}
        alt={ALT[mood] || ALT.happy}
        className={`${SIZES[size]} rounded-full object-cover shadow-card`}
        initial={animated && !reduce ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.22 }}
        onError={(event) => {
          event.currentTarget.src = '/icons/icon.svg';
        }}
      />
      {showMessage && message ? (
        <p className="font-display text-sm font-semibold text-navy sm:text-base">{message}</p>
      ) : null}
    </div>
  );
}

export function MascotMessage({ children }) {
  return <p className="font-display text-sm font-semibold text-navy">{children}</p>;
}
