import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from "three";
export declare class Scene {
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    controls: OrbitControls;
    constructor(id?: string);
    update(unsafeArtPath?: string): void;
}
