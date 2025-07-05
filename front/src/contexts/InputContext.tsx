'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type InputMethod = 'touch' | 'mouse' | 'hybrid';
type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface InputContextType {
  inputMethod: InputMethod;
  deviceType: DeviceType;
  isTouchDevice: boolean;
  isHoverSupported: boolean;
  screenSize: {
    width: number;
    height: number;
  };
}

const InputContext = createContext<InputContextType>({
  inputMethod: 'mouse',
  deviceType: 'desktop',
  isTouchDevice: false,
  isHoverSupported: true,
  screenSize: { width: 0, height: 0 },
});

export const useInput = () => useContext(InputContext);

export const InputProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inputMethod, setInputMethod] = useState<InputMethod>('mouse');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isHoverSupported, setIsHoverSupported] = useState(true);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Initial detection
    const detectInputMethod = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasHover = window.matchMedia('(hover: hover)').matches;
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      
      setIsTouchDevice(hasTouch);
      setIsHoverSupported(hasHover);
      
      if (hasTouch && !hasHover) {
        setInputMethod('touch');
      } else if (hasTouch && hasHover) {
        setInputMethod('hybrid');
      } else {
        setInputMethod('mouse');
      }
    };

    const detectDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
      setScreenSize({ width, height: window.innerHeight });
    };

    detectInputMethod();
    detectDeviceType();

    // Listen for input method changes
    let lastTouchTime = 0;
    const touchHandler = () => {
      lastTouchTime = Date.now();
      if (inputMethod === 'mouse') {
        setInputMethod('hybrid');
      }
    };

    const mouseHandler = () => {
      // If there was a touch within the last 500ms, ignore mouse events
      if (Date.now() - lastTouchTime > 500 && inputMethod === 'touch') {
        setInputMethod('hybrid');
      }
    };

    // Listen for resize
    const resizeHandler = () => {
      detectDeviceType();
    };

    // Add event listeners
    window.addEventListener('touchstart', touchHandler, { passive: true });
    window.addEventListener('mousemove', mouseHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);

    // Media query listeners
    const hoverQuery = window.matchMedia('(hover: hover)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    
    const handleHoverChange = (e: MediaQueryListEvent) => {
      setIsHoverSupported(e.matches);
      detectInputMethod();
    };
    
    const handlePointerChange = () => {
      detectInputMethod();
    };

    hoverQuery.addEventListener('change', handleHoverChange);
    pointerQuery.addEventListener('change', handlePointerChange);

    return () => {
      window.removeEventListener('touchstart', touchHandler);
      window.removeEventListener('mousemove', mouseHandler);
      window.removeEventListener('resize', resizeHandler);
      hoverQuery.removeEventListener('change', handleHoverChange);
      pointerQuery.removeEventListener('change', handlePointerChange);
    };
  }, [inputMethod]);

  return (
    <InputContext.Provider
      value={{
        inputMethod,
        deviceType,
        isTouchDevice,
        isHoverSupported,
        screenSize,
      }}
    >
      {children}
    </InputContext.Provider>
  );
};