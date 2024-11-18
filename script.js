import * as THREE from "https://cdn.skypack.dev/three@0.150.1";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.150.1/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.150.1/examples/jsm/loaders/GLTFLoader";
import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.1.0-alpha-16";

function getViewportSizeAtDepth(camera, depth) {
    const viewportHeightAtDepth = 2 * depth * Math.tan(THREE.MathUtils.degToRad(0.5 * camera.fov));
    const viewportWidthAtDepth = viewportHeightAtDepth * camera.aspect;
    return new THREE.Vector2(viewportWidthAtDepth, viewportHeightAtDepth);
}

function createCameraPlaneMesh(camera, depth, material) {
    if (camera.near > depth || depth > camera.far) {
        console.warn("Camera plane geometry will be clipped by the `camera`!");
    }
    const viewportSize = getViewportSizeAtDepth(camera, depth);
    const cameraPlaneGeometry = new THREE.PlaneGeometry(viewportSize.width, viewportSize.height);
    cameraPlaneGeometry.translate(0, 0, -depth);
    return new THREE.Mesh(cameraPlaneGeometry, material);
}
class BasicScene {
    constructor() {
        this.lastTime = 0;
        this.callbacks = [];

        this.height = window.innerHeight;
        this.width = (this.height * 1280) / 720;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.01, 5000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        THREE.ColorManagement.legacy = false;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        document.body.appendChild(this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);
        
        this.camera.position.z = 0;
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        let orbitTarget = this.camera.position.clone();
        orbitTarget.z -= 5;
        this.controls.target = orbitTarget;
        this.controls.update();
        
        const video = document.getElementById("video");
        const inputFrameTexture = new THREE.VideoTexture(video);
        if (!inputFrameTexture) {
            throw new Error("Failed to get the 'input_frame' texture!");
        }
        inputFrameTexture.encoding = THREE.sRGBEncoding;
        const inputFramesDepth = 500;
        const inputFramesPlane = createCameraPlaneMesh(this.camera, inputFramesDepth, new THREE.MeshBasicMaterial({ map: inputFrameTexture }));
        this.scene.add(inputFramesPlane);
        
        this.render();
        window.addEventListener("resize", this.resize.bind(this));
    }
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.render(this.scene, this.camera);
    }
    render(time = this.lastTime) {
        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;
       
        for (const callback of this.callbacks) {
            callback(delta);
        }
    
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame((t) => this.render(t));
    }
}