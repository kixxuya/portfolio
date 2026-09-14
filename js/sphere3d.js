import * as THREE from 'three';

const canvas = document.querySelector('#neural-sphere');
const container = canvas?.closest('.hero-visual');

if (canvas && container) {
    try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 5.2);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.72;

        const sphereGroup = new THREE.Group();
        scene.add(sphereGroup);

        scene.add(new THREE.AmbientLight('#6f7fff', 0.9));
        const cyanLight = new THREE.PointLight('#00f2fe', 18, 8, 2);
        cyanLight.position.set(2.8, 2.2, 3.4);
        scene.add(cyanLight);
        const pinkLight = new THREE.PointLight('#ff3bca', 16, 8, 2);
        pinkLight.position.set(-2.6, -0.8, 3.2);
        scene.add(pinkLight);
        const rimLight = new THREE.PointLight('#9d50bb', 12, 7, 2);
        rimLight.position.set(0, 1.2, -3.2);
        scene.add(rimLight);

        const cyan = new THREE.Color('#00f2fe');
        const pink = new THREE.Color('#ff3bca');
        const violet = new THREE.Color('#9d50bb');

        const backGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(4.25, 4.25),
            new THREE.ShaderMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false,
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    void main() {
                        vec2 point = vUv - vec2(0.5);
                        float radius = length(point);
                        float halo = 1.0 - smoothstep(0.08, 0.5, radius);
                        float ring = 1.0 - smoothstep(0.0, 0.12, abs(radius - 0.33));
                        vec3 magenta = vec3(1.0, 0.02, 0.72);
                        vec3 cyan = vec3(0.0, 0.95, 1.0);
                        vec3 color = mix(magenta, cyan, vUv.x);
                        gl_FragColor = vec4(color * (halo * 0.6 + ring * 0.22), halo * 0.38);
                    }
                `
            })
        );
        backGlow.position.z = -1.58;
        scene.add(backGlow);

        const particleCount = 5600;
        const shellPositions = new Float32Array(particleCount * 3);
        const shellColors = new Float32Array(particleCount * 3);

        for (let index = 0; index < particleCount; index += 1) {
            const y = 1 - (index / (particleCount - 1)) * 2;
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = Math.PI * (3 - Math.sqrt(5)) * index;
            const wave = 1.46 + Math.sin(theta * 3 + y * 11) * 0.035 + (Math.random() - 0.5) * 0.025;
            const x = Math.cos(theta) * radiusAtY * wave;
            const z = Math.sin(theta) * radiusAtY * wave;

            shellPositions[index * 3] = x;
            shellPositions[index * 3 + 1] = y * wave;
            shellPositions[index * 3 + 2] = z;

            const mix = THREE.MathUtils.clamp((x / 1.46 + 1) / 2, 0, 1);
            const color = pink.clone().lerp(cyan, mix).lerp(new THREE.Color('#ffffff'), Math.random() * 0.08);
            shellColors[index * 3] = color.r;
            shellColors[index * 3 + 1] = color.g;
            shellColors[index * 3 + 2] = color.b;
        }

        const shellSource = new THREE.BufferGeometry();
        shellSource.setAttribute('position', new THREE.BufferAttribute(shellPositions, 3));
        shellSource.setAttribute('color', new THREE.BufferAttribute(shellColors, 3));
        const shellPoints = new THREE.Points(shellSource, new THREE.ShaderMaterial({
            uniforms: {
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uOpacity: { value: 0.64 }
            },
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            vertexShader: `
                varying vec3 vColor;
                uniform float uPixelRatio;
                void main() {
                    vColor = color;
                    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 8.3 * uPixelRatio * (1.8 / -viewPosition.z);
                    gl_Position = projectionMatrix * viewPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                uniform float uOpacity;
                void main() {
                    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                    float glow = 1.0 - smoothstep(0.04, 0.5, distanceToCenter);
                    float core = 1.0 - smoothstep(0.0, 0.16, distanceToCenter);
                    if (glow <= 0.0) discard;
                    gl_FragColor = vec4(vColor * (1.18 + core * 0.45), min(1.0, glow * 0.84 + core) * uOpacity);
                }
            `
        }));
        sphereGroup.add(shellPoints);

        const wireframe = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.46, 3),
            new THREE.MeshBasicMaterial({ color: violet, wireframe: true, transparent: true, opacity: 0.006 })
        );
        sphereGroup.add(wireframe);

        const glowCore = new THREE.Mesh(
            new THREE.SphereGeometry(1.49, 52, 38),
            new THREE.ShaderMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vViewPosition;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                        vViewPosition = viewPosition.xyz;
                        gl_Position = projectionMatrix * viewPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    varying vec3 vViewPosition;
                    void main() {
                        float rim = pow(1.0 - max(dot(vNormal, normalize(-vViewPosition)), 0.0), 2.25);
                        vec3 magenta = vec3(1.0, 0.05, 0.72);
                        vec3 cyan = vec3(0.0, 0.95, 1.0);
                        vec3 color = mix(magenta, cyan, vNormal.x * 0.5 + 0.5);
                        float innerGlow = 0.075 + max(dot(vNormal, normalize(-vViewPosition)), 0.0) * 0.035;
                        gl_FragColor = vec4(color * (1.05 + rim * 0.55), innerGlow + rim * 0.34);
                    }
                `
            })
        );
        sphereGroup.add(glowCore);

        const createRibbon = (color, rotation, offset) => {
            const points = [];
            for (let index = 0; index <= 120; index += 1) {
                const angle = (index / 120) * Math.PI * 2;
                const radius = 1.5 + Math.sin(angle * 3 + offset) * 0.06;
                points.push(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(angle * 2 + offset) * 0.28,
                    Math.sin(angle) * radius
                ));
            }
            const curve = new THREE.CatmullRomCurve3(points, true);
            const ribbon = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 160, 0.009, 5, true),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending })
            );
            ribbon.rotation.set(...rotation);
            sphereGroup.add(ribbon);
        };

        createRibbon(pink, [0.35, 0.1, -0.28], 0);
        createRibbon(cyan, [-0.42, 0.2, 0.38], 1.4);
        createRibbon(violet, [0.12, -0.45, 0.72], 2.6);

        const nodePositions = [
            [-0.62, 0.72, 0.34], [0.08, 0.9, -0.2], [0.72, 0.58, 0.25],
            [-0.82, 0.12, -0.12], [-0.16, 0.25, 0.72], [0.58, 0.08, -0.58],
            [-0.58, -0.52, 0.44], [0.06, -0.32, -0.72], [0.72, -0.48, 0.18],
            [0, -0.94, 0.18]
        ].map(([x, y, z]) => new THREE.Vector3(x, y, z));

        const nodeGeometry = new THREE.SphereGeometry(0.085, 28, 20);
        const neuralNodes = [];
        nodePositions.forEach((position, index) => {
            const color = index % 2 ? cyan : pink;
            const material = new THREE.MeshPhysicalMaterial({
                color: color.clone().lerp(new THREE.Color('#ffffff'), 0.18),
                emissive: color,
                emissiveIntensity: 1.3,
                metalness: 0.08,
                roughness: 0.12,
                transmission: 0.22,
                thickness: 0.45,
                clearcoat: 1,
                clearcoatRoughness: 0.08
            });
            const node = new THREE.Mesh(nodeGeometry, material);
            node.position.copy(position);
            node.userData.baseScale = index === 4 ? 1.38 : 1;
            node.userData.phase = index * 0.72;
            node.scale.setScalar(node.userData.baseScale);
            sphereGroup.add(node);
            neuralNodes.push(node);

            const highlight = new THREE.Mesh(
                new THREE.SphereGeometry(0.026, 12, 8),
                new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 })
            );
            highlight.position.copy(position).add(new THREE.Vector3(-0.032, 0.035, 0.075));
            sphereGroup.add(highlight);

            const aura = new THREE.Mesh(
                new THREE.SphereGeometry(0.155, 16, 12),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            aura.position.copy(position);
            sphereGroup.add(aura);

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.125, 0.006, 8, 32),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending })
            );
            ring.position.copy(position);
            ring.rotation.set(Math.PI * 0.32 + index * 0.08, index * 0.27, index * 0.16);
            sphereGroup.add(ring);
        });

        const linePositions = [];
        const lineColors = [];
        const beamMaterials = [
            new THREE.MeshBasicMaterial({ color: pink, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending }),
            new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending })
        ];
        nodePositions.forEach((start, startIndex) => {
            nodePositions.forEach((end, endIndex) => {
                if (endIndex <= startIndex || start.distanceTo(end) > 1.42) return;
                linePositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
                const startColor = start.x < 0 ? pink : cyan;
                const endColor = end.x < 0 ? pink : cyan;
                lineColors.push(startColor.r, startColor.g, startColor.b, endColor.r, endColor.g, endColor.b);

                if ((startIndex + endIndex) % 2 === 0) {
                    const direction = end.clone().sub(start);
                    const beam = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.006, 0.006, direction.length(), 6),
                        beamMaterials[startIndex % 2]
                    );
                    beam.position.copy(start).add(end).multiplyScalar(0.5);
                    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
                    sphereGroup.add(beam);
                }
            });
        });

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
        sphereGroup.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.82,
            blending: THREE.AdditiveBlending
        })));

        const sparkPositions = [];
        const sparkColors = [];
        for (let index = 0; index < 180; index += 1) {
            const radius = 1.72 + Math.random() * 0.45;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            sparkPositions.push(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
            const color = index % 2 ? cyan : pink;
            sparkColors.push(color.r, color.g, color.b);
        }
        const sparkGeometry = new THREE.BufferGeometry();
        sparkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sparkPositions, 3));
        sparkGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sparkColors, 3));
        const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({
            vertexColors: true, size: 0.032, transparent: true, opacity: 0.72,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        sphereGroup.add(sparks);

        let pointerX = 0;
        let pointerY = 0;
        let isVisible = true;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const startedAt = performance.now();

        const resize = () => {
            const { width, height } = container.getBoundingClientRect();
            renderer.setSize(width * 1.18, height * 1.18, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        container.addEventListener('pointermove', (event) => {
            const rect = container.getBoundingClientRect();
            pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.75;
            pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.55;
        });
        container.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });

        new ResizeObserver(resize).observe(container);
        new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }).observe(container);
        resize();

        const animate = () => {
            if (isVisible) {
                const elapsed = (performance.now() - startedAt) / 1000;
                if (!reducedMotion) sphereGroup.rotation.y += 0.0035;
                sphereGroup.rotation.x += (pointerY - sphereGroup.rotation.x) * 0.045;
                sphereGroup.rotation.z += ((-pointerX * 0.22) - sphereGroup.rotation.z) * 0.04;
                camera.position.x += (pointerX - camera.position.x) * 0.035;
                camera.position.y += (-pointerY - camera.position.y) * 0.035;
                camera.lookAt(0, 0, 0);
                sparks.rotation.y = elapsed * -0.07;
                neuralNodes.forEach((node) => {
                    const pulse = node.userData.baseScale * (1 + Math.sin(elapsed * 2.1 + node.userData.phase) * 0.075);
                    node.scale.setScalar(pulse);
                    node.material.emissiveIntensity = 1.15 + Math.sin(elapsed * 2.1 + node.userData.phase) * 0.3;
                });
                renderer.render(scene, camera);
            }
            requestAnimationFrame(animate);
        };
        animate();
    } catch (error) {
        container.classList.add('webgl-failed');
        console.warn('3D sphere could not start.', error);
    }
}
