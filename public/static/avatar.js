// Avatar rendering with Three.js - Manual Pose Adjustment + Clipping
document.addEventListener("DOMContentLoaded", () => {
    // Set up the scene
    const container = document.getElementById('avatar-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf9fbfd);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 0.55;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true; // ✅ Enable clipping
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Load the GLB model
    const loader = new THREE.GLTFLoader();
    loader.load(
        '/static/avatar.glb',
        function (gltf) {
            const model = gltf.scene;
            scene.add(model);

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - center.y) - size.y / 2 + -0.6;
            model.position.z += (model.position.z - center.z);

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.5 / maxDim;
            model.scale.set(scale, scale, scale);
            model.rotation.x = -0.1; // Slight downward tilt

            // ✅ Clipping plane to hide lower body (below chest)
            const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.7); // Adjust 0.2 as needed

            // ✅ Apply clipping plane to all mesh materials
            model.traverse((child) => {
                if (child.isMesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.clippingPlanes = [clipPlane];
                            mat.clipShadows = true;
                        });
                    } else {
                        child.material.clippingPlanes = [clipPlane];
                        child.material.clipShadows = true;
                    }
                }
            });

            // ✅ Pose adjustment for arms
            model.traverse((child) => {
                if (child.isBone) {
                    const name = child.name.toLowerCase();

                    if (name.includes('leftarm') || name.includes('left_shoulder')) {
                        child.rotation.x = THREE.MathUtils.degToRad(65);
                        child.rotation.z = THREE.MathUtils.degToRad(5);
                    }

                    if (name.includes('leftforearm') || name.includes('leftelbow')) {
                        child.rotation.x = THREE.MathUtils.degToRad(10);
                    }

                    if (name.includes('rightarm') || name.includes('right_shoulder')) {
                        child.rotation.x = THREE.MathUtils.degToRad(65);
                        child.rotation.z = THREE.MathUtils.degToRad(5);
                    }

                    if (name.includes('rightforearm') || name.includes('rightelbow')) {
                        child.rotation.x = THREE.MathUtils.degToRad(10);
                    }

                    if (name.includes('hand')) {
                        child.rotation.x = THREE.MathUtils.degToRad(10);
                        child.rotation.z = THREE.MathUtils.degToRad(5);
                    }
                }
            });

            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }
            animate();
        },
        undefined,
        function (error) {
            console.error('Error loading avatar:', error);
        }
    );

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});
