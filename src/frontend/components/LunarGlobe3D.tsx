import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export interface SunDirectionVector {
  x: number
  y: number
  z: number
}

interface LunarGlobe3DProps {
  className?: string
  autoRotate?: boolean
  rotationSpeed?: number
  sunDirection?: SunDirectionVector
  onInteractionStart?: () => void
}

/**
 * Checks if the browser runtime supports WebGL rendering.
 */
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

export function LunarGlobe3D({
  className = '',
  autoRotate = true,
  rotationSpeed = 0.0007,
  sunDirection,
  onInteractionStart,
}: LunarGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null)
  const resetViewRef = useRef<(() => void) | null>(null)
  const [webGLFailed, setWebGLFailed] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Dynamically update directional sunlight when astronomical Sun vector changes
  useEffect(() => {
    if (sunLightRef.current && sunDirection) {
      const lightDistance = 6.0
      sunLightRef.current.position.set(
        sunDirection.x * lightDistance,
        sunDirection.y * lightDistance,
        sunDirection.z * lightDistance
      )
    }
  }, [sunDirection?.x, sunDirection?.y, sunDirection?.z])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    if (!isWebGLSupported()) {
      setWebGLFailed(true)
      setIsLoading(false)
      return
    }

    let animationFrameId: number
    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let moonMesh: THREE.Mesh | null = null
    let cloudsMesh: THREE.Mesh | null = null
    let starsMesh: THREE.Points | null = null

    // Authentic Earth-facing sub-observer orientation
    const DEFAULT_ROTATION_X = 0.08
    const DEFAULT_ROTATION_Y = -1.04

    // Interaction tracking state
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let targetRotationX = DEFAULT_ROTATION_X
    let targetRotationY = DEFAULT_ROTATION_Y
    let currentRotationX = DEFAULT_ROTATION_X
    let currentRotationY = DEFAULT_ROTATION_Y

    // Respect user's accessibility reduced-motion preference
    let prefersReducedMotion = false
    let mediaQuery: MediaQueryList | null = null
    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        prefersReducedMotion = mediaQuery.matches
        mediaQuery.addEventListener?.('change', handleMotionChange)
      } catch {
        // Fallback for older environments
      }
    }

    try {
      const width = container.clientWidth || 500
      const height = container.clientHeight || 500

      // 1. Scene
      scene = new THREE.Scene()

      // 2. Camera
      camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000)
      camera.position.z = 2.45

      // 3. Renderer with antialiasing and alpha channel for deep space integration
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      container.appendChild(renderer.domElement)

      // 4. Subtle 3D Starfield background
      const starCount = 900
      const starGeometry = new THREE.BufferGeometry()
      const starPositions = new Float32Array(starCount * 3)
      const starSizes = new Float32Array(starCount)

      for (let i = 0; i < starCount; i++) {
        const radius = 25 + Math.random() * 40
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(Math.random() * 2 - 1)

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
        starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        starPositions[i * 3 + 2] = radius * Math.cos(phi)
        starSizes[i] = Math.random() * 1.5 + 0.5
      }

      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
      starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))

      const starMaterial = new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.8,
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
      })

      starsMesh = new THREE.Points(starGeometry, starMaterial)
      scene.add(starsMesh)

      // 5. Authentic Lunar Surface Sphere
      const sphereGeometry = new THREE.SphereGeometry(0.85, 64, 64)
      const textureLoader = new THREE.TextureLoader()

      const texturePath = '/textures/moon_surface.jpg'
      const moonTexture = textureLoader.load(
        texturePath,
        () => {
          setIsLoading(false)
        },
        undefined,
        () => {
          // If texture fails, gracefully keep procedural shading
          setIsLoading(false)
        }
      )
      moonTexture.colorSpace = THREE.SRGBColorSpace

      const moonMaterial = new THREE.MeshStandardMaterial({
        map: moonTexture,
        bumpMap: moonTexture,
        bumpScale: 0.045,
        roughness: 0.88,
        metalness: 0.05,
      })

      moonMesh = new THREE.Mesh(sphereGeometry, moonMaterial)
      moonMesh.rotation.x = DEFAULT_ROTATION_X
      moonMesh.rotation.y = DEFAULT_ROTATION_Y
      scene.add(moonMesh)

      // 6. Atmospheric Rim Glow (Subtle moonlight limb glow)
      const atmosphereGeometry = new THREE.SphereGeometry(0.858, 64, 64)
      const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
            gl_FragColor = vec4(0.55, 0.72, 0.92, 0.22) * intensity;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
      })

      cloudsMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
      cloudsMesh.rotation.x = DEFAULT_ROTATION_X
      cloudsMesh.rotation.y = DEFAULT_ROTATION_Y
      scene.add(cloudsMesh)

      // 7. Physically Plausible Directional Sunlight & Deep Space Earthshine
      const lightDistance = 6.0
      const sunDirX = sunDirection?.x ?? 0.58
      const sunDirY = sunDirection?.y ?? 0.06
      const sunDirZ = sunDirection?.z ?? 0.81

      const sunLight = new THREE.DirectionalLight(0xffffff, 2.7)
      sunLight.position.set(sunDirX * lightDistance, sunDirY * lightDistance, sunDirZ * lightDistance)
      scene.add(sunLight)
      sunLightRef.current = sunLight

      // Deep space ambient earthshine (faint cool fill so shadowed relief is softly discernable)
      const ambientLight = new THREE.AmbientLight(0x0a1424, 0.16)
      scene.add(ambientLight)

      // Reset view callback to restore Earth-facing observer orientation
      resetViewRef.current = () => {
        targetRotationX = DEFAULT_ROTATION_X
        targetRotationY = DEFAULT_ROTATION_Y
      }

      // Mouse & touch interaction handlers
      const handlePointerDown = (clientX: number, clientY: number) => {
        isDragging = true
        previousMousePosition = { x: clientX, y: clientY }
        onInteractionStart?.()
      }

      const handlePointerMove = (clientX: number, clientY: number) => {
        if (!isDragging) return
        const deltaX = clientX - previousMousePosition.x
        const deltaY = clientY - previousMousePosition.y

        targetRotationY += deltaX * 0.005
        targetRotationX += deltaY * 0.005

        // Clamp vertical tilt to prevent disorienting flip
        targetRotationX = Math.max(-0.6, Math.min(0.6, targetRotationX))

        previousMousePosition = { x: clientX, y: clientY }
      }

      const handlePointerUp = () => {
        isDragging = false
      }

      const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY)
      const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY)
      const onMouseUp = () => handlePointerUp()

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)
        }
      }
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
        }
      }
      const onTouchEnd = () => handlePointerUp()

      const onDoubleClick = () => {
        targetRotationX = DEFAULT_ROTATION_X
        targetRotationY = DEFAULT_ROTATION_Y
      }

      const domElem = renderer.domElement
      domElem.style.cursor = 'grab'
      domElem.addEventListener('mousedown', onMouseDown)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      domElem.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd)
      domElem.addEventListener('dblclick', onDoubleClick)

      // Responsive Resize Observer
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width
          const newHeight = entry.contentRect.height
          if (newWidth > 0 && newHeight > 0 && camera && renderer) {
            camera.aspect = newWidth / newHeight
            camera.updateProjectionMatrix()
            renderer.setSize(newWidth, newHeight)
          }
        }
      })
      resizeObserver.observe(container)

      // 8. Animation Loop
      // Approximate 150-second full rotation period (~0.04189 rad/sec)
      const ROTATION_RAD_PER_SEC = (2 * Math.PI) / 150
      let lastTimestamp = performance.now()

      const animate = (timestamp: number) => {
        animationFrameId = requestAnimationFrame(animate)

        const deltaSeconds = Math.min(Math.max(0, (timestamp - lastTimestamp) / 1000), 0.1)
        lastTimestamp = timestamp

        // Smooth damping interpolation
        currentRotationX += (targetRotationX - currentRotationX) * 0.05
        currentRotationY += (targetRotationY - currentRotationY) * 0.05

        // Smooth continuous idle rotation: active when autoRotate is true, pauses during active user drag, disabled if prefers-reduced-motion
        if (autoRotate && !isDragging && !prefersReducedMotion) {
          targetRotationY += ROTATION_RAD_PER_SEC * deltaSeconds
        }

        if (moonMesh) {
          moonMesh.rotation.y = currentRotationY
          moonMesh.rotation.x = currentRotationX
        }

        if (cloudsMesh) {
          cloudsMesh.rotation.y = currentRotationY
          cloudsMesh.rotation.x = currentRotationX
        }

        if (starsMesh) {
          starsMesh.rotation.y += 0.0001
        }

        if (renderer && scene && camera) {
          renderer.render(scene, camera)
        }
      }

      animationFrameId = requestAnimationFrame(animate)

      // Cleanup
      return () => {
        cancelAnimationFrame(animationFrameId)
        resizeObserver.disconnect()
        mediaQuery?.removeEventListener?.('change', handleMotionChange)

        domElem.removeEventListener('mousedown', onMouseDown)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        domElem.removeEventListener('touchstart', onTouchStart)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        domElem.removeEventListener('dblclick', onDoubleClick)

        if (domElem.parentNode) {
          domElem.parentNode.removeChild(domElem)
        }

        sphereGeometry.dispose()
        atmosphereGeometry.dispose()
        starGeometry.dispose()
        moonMaterial.dispose()
        atmosphereMaterial.dispose()
        starMaterial.dispose()
        moonTexture.dispose()
        renderer?.dispose()
      }
    } catch (err) {
      console.warn('[LunarGlobe3D] WebGL initialization failed, switching to optical fallback:', err)
      setWebGLFailed(true)
      setIsLoading(false)
    }
  }, [autoRotate, rotationSpeed, onInteractionStart])

  return (
    <div className={`lunar-globe-wrapper ${className}`} aria-label="3D Interactive Lunar Sphere">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className={`lunar-globe-canvas-container ${webGLFailed ? 'lunar-globe-canvas-container--hidden' : ''}`}
      />

      {/* Subtle control to reset to authentic Earth-facing view */}
      {!isLoading && !webGLFailed && (
        <div className="lunar-globe-controls">
          <button
            type="button"
            className="lunar-globe-reset-btn font-mono"
            onClick={() => resetViewRef.current?.()}
            title="Reset to Earth-facing orientation (or double click canvas)"
            aria-label="Reset lunar orientation to Earth view"
          >
            EARTH VIEW
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && !webGLFailed && (
        <div className="lunar-globe-loader" aria-live="polite">
          <div className="lunar-globe-spinner" />
          <span className="font-mono text-xs">INITIALIZING LUNAR ORBIT...</span>
        </div>
      )}

      {/* Graceful Fallback if WebGL fails */}
      {webGLFailed && (
        <div className="lunar-globe-fallback" role="img" aria-label="Optical Lunar Surface Projection">
          <img
            src="/textures/moon_surface.jpg"
            alt="Authentic Lunar Surface"
            className="lunar-fallback-image"
          />
          <div className="lunar-fallback-overlay" />
          <div className="lunar-fallback-badge font-mono text-xs">
            OPTICAL LUNAR PROJECTION (2D FALLBACK)
          </div>
        </div>
      )}
    </div>
  )
}
