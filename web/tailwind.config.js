/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			blue: {
  				'50': '#e6f8ff',
  				'100': '#b3e7ff',
  				'200': '#80d6ff',
  				'300': '#4dc4ff',
  				'400': '#1ab3ff',
  				'500': '#00a2f3',
  				'600': '#0082c2',
  				'700': '#006192',
  				'800': '#004161',
  				'900': '#002031'
  			},
  			teal: {
  				'50': '#e6fff9',
  				'100': '#b3ffee',
  				'200': '#80ffe3',
  				'300': '#4dffd8',
  				'400': '#1affcd',
  				'500': '#00e6b5',
  				'600': '#00b891',
  				'700': '#008a6d',
  				'800': '#005c48',
  				'900': '#002e24'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: 0,
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: 1,
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in-right': {
  				'0%': {
  					opacity: 0,
  					transform: 'translateX(-10px)'
  				},
  				'100%': {
  					opacity: 1,
  					transform: 'translateX(0)'
  				}
  			},
  			'fade-in-left': {
  				'0%': {
  					opacity: 0,
  					transform: 'translateX(10px)'
  				},
  				'100%': {
  					opacity: 1,
  					transform: 'translateX(0)'
  				}
  			},
  			'spin-slow': {
  				'0%': {
  					transform: 'rotate(0deg)'
  				},
  				'100%': {
  					transform: 'rotate(360deg)'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			'pulse-soft': {
  				'0%, 100%': {
  					opacity: 1
  				},
  				'50%': {
  					opacity: 0.7
  				}
  			},
  			'scale-up': {
  				'0%': {
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					transform: 'scale(1)'
  				}
  			},
  			ripple: {
  				'0%': {
  					transform: 'scale(0)',
  					opacity: 1
  				},
  				'100%': {
  					transform: 'scale(4)',
  					opacity: 0
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.5s ease-out',
  			'fade-in-right': 'fade-in-right 0.5s ease-out',
  			'fade-in-left': 'fade-in-left 0.5s ease-out',
  			'spin-slow': 'spin-slow 3s linear infinite',
  			float: 'float 3s ease-in-out infinite',
  			'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
  			'scale-up': 'scale-up 0.3s ease-out',
  			ripple: 'ripple 0.6s linear'
  		},
  		backgroundImage: {
  			'0': 0,
  			'20': ' viewBox=',
  			'100': 20,
  			'wave-pattern': 'url(\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"data:image/svg+xml,%3Csvg width=',
  			' xmlns=': 'http'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
