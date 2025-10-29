/**
 * Logger condicional que solo funciona en desarrollo
 * En producción, todos los logs se eliminan para mejorar el rendimiento
 */

const isDevelopment = import.meta.env.DEV

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },
  
  group: (label) => {
    if (isDevelopment) {
      console.group(label)
    }
  },
  
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },
  
  time: (label) => {
    if (isDevelopment) {
      console.time(label)
    }
  },
  
  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  }
}

export default logger
