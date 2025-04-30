import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

    // An axis object to visualize the 3 axes in a simple way.
    // sThe X axis is red. The Y axis is green. The Z axis is blue.
    // const axesHelper = new THREE.AxesHelper( 5 );
    // this.scene.add( axesHelper );
    //this.camera.position.z -= 30;

    this.scene.background = new THREE.Color(0x001000); // Dark blue color


    const sunlight = new THREE.DirectionalLight(0xfffffb, 0.9);
    sunlight.position.set(200, 1000, 900);
    sunlight.castShadow = true;

    sunlight.shadow.mapSize.width = 1024;
    sunlight.shadow.mapSize.height = 1024;
    sunlight.shadow.camera.near = 10;
    sunlight.shadow.camera.far = 1000;
    sunlight.intensity = 1;
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
              opacity: 0.85, // Fixed opacity to avoid recalculations
              depthWrite: true, // Disable depth writing for better performance
              map: new THREE.TextureLoader().load(SPARK_PLUG_IMAGE_URL), // Add a texture for particles
              alphaTest: 0.5 // Improve performance by discarding fully transparent pixels
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
      group.scale.set(1, -1, 1); // Flip the group vertically

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
      camera.position.x = 4;
      camera.position.y = 4;
      camera.position.z = -13;
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      // get right edge of the box
      const rightEdge = box.max.x;


      

      camera.lookAt(center);

        

      const animate = () => {
        requestAnimationFrame(animate);
        const delta = this.clock.getDelta();
        const time = performance.now() * 0.012;

        // loop over children by column, assume consecutive rows 
        for (let x = 0; x < imageData.width; x++) {
          for (let y = 0; y < imageData.height; y++) {
            const i = y * imageData.width + x;
            if (i < group.children.length) {
              
              const child = group.children[i];
              const sine = Math.sin((1/2) * Math.PI * time + child.id);
    
              const scaleX = sine * 0.000001 + 0.01; // Dynamic scaling
              const scaleY = sine * 0.000009 + 0.01; // Dynamic scaling
              const scaleZ = sine * 0.0004 + 0.03; // Dynamic scaling
    
              child.scale.set(scaleX, scaleY, scaleZ);
              
              const sine2 = Math.sin((1/8) * ((Math.PI) * time + child.id));
              
              child.position.z += Math.PI/66 * range * -sine2;
            }
          }
        }

        group.rotateOnAxis(new THREE.Vector3(0, -10, 0), Math.sin(time/100) * 0.0005);

        this.controls.update(delta);
        renderer.render(scene, camera);
      };
      animate();
    });
  }
}
