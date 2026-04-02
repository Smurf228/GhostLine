import { useState, useEffect, useRef } from 'react';

const glitchChars = 'アイウエオカキクケコ!@#$%^&*01';

const DecryptText = ({ text }) => {
  const [display, setDisplay] = useState(() => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return result;
  });
  const stepRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const totalSteps = 8;
    const length = text.length;

    intervalRef.current = setInterval(() => {
      stepRef.current++;
      let result = '';

      for (let i = 0; i < length; i++) {
        const revealAt = Math.floor((i / length) * totalSteps);
        if (stepRef.current > revealAt) {
          result += text[i];
        } else {
          result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
      }

      setDisplay(result);

      if (stepRef.current >= totalSteps) {
        clearInterval(intervalRef.current);
      }
    }, 150);

    return () => clearInterval(intervalRef.current);
  }, [text]);

  return <span>{display}</span>;
};

export default DecryptText;
