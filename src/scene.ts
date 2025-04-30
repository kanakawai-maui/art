import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { UltraHDRLoader } from "three/examples/jsm/loaders/UltraHDRLoader";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

const DEFAULT_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Flag_of_the_United_States.svg/1600px-Flag_of_the_United_States.svg.png?20240524035322";
const SPARK_PLUG_IMAGE_URL = "https://threejs.org/examples/textures/sprites/spark1.png";

// Create Three.js scene
export class Scene {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock = new THREE.Clock();
  controls: OrbitControls;

  constructor(id: string = "art") {
    // Destroy past scene if it exists
    const existingRenderer = document.querySelector(`#${id} canvas`);
    if (existingRenderer) {
      console.info("Destroying existing scene.");
      existingRenderer.remove();
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1024,
    );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById(id);
    if (container) {
      console.info(`Container with id "${id}" found.`);
      container.appendChild(this.renderer.domElement);
    } else {
      console.error(`Container with id "${id}" not found.`);
    }
    // Set the background to black
    this.scene.background = new THREE.Color(0x000000); // Black color

    // Initiate OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const loadEnvironment = function ( resolution = '4k', type: 'HalfFloatType' | 'FloatType', scene: THREE.Scene ) {

      loader.setDataType( THREE[type as 'HalfFloatType' | 'FloatType'] );

      loader.load( `https://threejs.org/examples/textures/equirectangular/spruit_sunrise_${resolution}.hdr.jpg`, function ( texture ) {

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        scene.background = texture;
        scene.environment = texture;

      } );
    };

    // Add light fog to the scene
    const fogColor = new THREE.Color(0x000000); // Black color for fog
    const fogDensity = 0.02; // Adjust density as needed
    this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    const loader = new UltraHDRLoader();
				loader.setDataType( THREE.FloatType );
    loadEnvironment( '4k', 'HalfFloatType', this.scene );

    const sunlight = new THREE.DirectionalLight(0xfffffb, 0.9);
    sunlight.position.set(2000, 1000, 900);
    sunlight.castShadow = true;

    sunlight.shadow.mapSize.width = 1024;
    sunlight.shadow.mapSize.height = 1024;
    sunlight.shadow.camera.near = 10;
    sunlight.shadow.camera.far = 1000;
    sunlight.intensity = 0.5;
    sunlight.castShadow = true;
    this.scene.add(sunlight);

    const spotLight = new THREE.SpotLight(0xadd8e6, 0.7);
    spotLight.position.set(500, 500, 500);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 1500;
    spotLight.castShadow = true;
    this.scene.add(spotLight);
  }

  update(
    unsafeArtPath: string = DEFAULT_IMAGE_URL,
    res: number = 10,
    range: number = 1) {

    const { camera, scene, renderer } = this;

    const loader = new THREE.TextureLoader();

    if(!unsafeArtPath.startsWith("http")) {
      throw new Error("Invalid URL: " + unsafeArtPath);
    }

    const safeArtPath = unsafeArtPath.replace(/\\/g, "/");

    console.log("Loading art from: ", safeArtPath);

    loader.load(safeArtPath, (texture) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Failed to get canvas context');
        return;
      }

      // if the image is landscape, make the maxWidth 2000px
      // if the image is portrait, make the maxWidth 1000px


      const maxWidth = texture.image.width > texture.image.height ? 1500 : 1000;
      const scale = Math.min(1, maxWidth / texture.image.width);
      canvas.width = texture.image.width * scale;
      canvas.height = texture.image.height * scale;
      context.translate(canvas.width, 0); // Flip horizontally
      context.scale(-1, 1); // Reverse the image
      context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const group = new THREE.Group();

      for (let y = 0; y < imageData.height; y += res) {
        for (let x = 0; x < imageData.width; x += res) {
          const index = (y * imageData.width + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const alpha = imageData.data[index + 3];
          if (alpha > 0) {
            const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);
            // adjust the hue from blue to red from bottom left corner to top right corner
            const hue = Math.atan2(y - imageData.height / 2, x - imageData.width / 2) / Math.PI / 10;
            const saturation = 1;
            const lightness = 0.5;
            const hslColor = new THREE.Color().setHSL(hue, saturation, lightness);

            // blend the original color with the HSL color
            color.lerp(hslColor, 0.05); // Adjust the blend factor (0.5) as needed

            const material = new THREE.PointsMaterial({
              color: color,
              size: 0.7, // Fixed size for better performance
              sizeAttenuation: true,
              transparent: true,
              opacity: 0.99, // Fixed opacity to avoid recalculations
              depthWrite: true, // Disable depth writing for better performance
              map: new THREE.TextureLoader().load(SPARK_PLUG_IMAGE_URL), // Add a texture for particles
              alphaTest: 0.4 // Improve performance by discarding fully transparent pixels
            });

            material.needsUpdate = true;
            // create a particle
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([x, y, 0]); // Position of the particle
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            const particle = new THREE.Points(geometry, material);
            group.add(particle);
          }
        }
      }

      // flip the group
      group.scale.set(-1, 1, 1); // Flip the group horizontally
      // flip the group vertically
      group.scale.set(1.01, -1.01, 1); // Flip the group vertically

      // remove previous group from the scene
      const previousGroup = scene.getObjectByName("artGroup");
      if (previousGroup) {
        scene.remove(previousGroup);
      }
      group.name = "artGroup";
      scene.add(group);

      console.log("Shapes added to the scene");

      // center the group
      group.position.x = -7;
      group.position.y = 4;
      group.position.z = 0;

      // set camera position
      camera.position.x = -19;
      camera.position.y = -2;
      camera.position.z = -17;
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());

      camera.lookAt(center);

      // Add postprocessing effects
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      // Add a bloom effect with optimized parameters
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.07, // Reduced strength for better performance
        0.6, // Adjusted radius for efficiency
        0.5 // Slightly increased threshold to reduce overdraw
      );
      bloomPass.renderToScreen = true; // Avoid unnecessary passes
      composer.addPass(bloomPass);

      const fontLoader = new FontLoader();
      fontLoader.load('https://threejs.org/examples/fonts/gentilis_bold.typeface.json', (font) => {
        const textGeometry = new TextGeometry('Good Morning', {
          font: font,
          size: 1.5,
          depth: 0.2,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.02,
          bevelSegments: 5,
        });

        const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Position the text above the group
        textMesh.position.set(-3, 6, 0); // Adjust position as needed
        textMesh.name = "goodMorningText";

        // Remove previous text if it exists
        const previousText = scene.getObjectByName("goodMorningText");
        if (previousText) {
          scene.remove(previousText);
        }

        // Flip the text horizontally
        textMesh.scale.x = -1;
        textMesh.position.x -= -13;

        scene.add(textMesh);
    });


      const render = () => {
        setTimeout(() => {
          requestAnimationFrame(render);
          const delta = this.clock.getDelta();
          const time = performance.now() * 0.125;

          // Optimize by iterating directly over group.children
          const children = group.children;
          const len = children.length;
          for (let i = 0; i < len; i++) {
            const child = children[i];
            const sine = Math.sin(0.5 * Math.PI * time + child.id);
            const cosine = Math.cos(0.5 * Math.PI * time + child.id);

            const scaleX = sine * 0.000005 + 0.01; // Dynamic scaling
            const scaleY = sine * 0.000009 + 0.01; // Dynamic scaling
            const scaleZ = cosine * 0.0004 + 0.03; // Dynamic scaling

            child.scale.set(scaleX, scaleY, scaleZ);

            const sine2 = Math.sin(0.125 * (Math.PI * time + child.id));

            child.position.z += Math.PI / 66 * range * -sine2;
          }

          this.controls.update(delta);
          renderer.render(scene, camera);
          composer.render(delta);
        }, 1000 / 60); // Limit to ~30 FPS
      };
      render();
    });
  }
}
