/* eslint-disable no-case-declarations */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    SphereGeometry,
    BackSide,
    Mesh,
    MeshBasicMaterial,
    Vector3,
    PCFSoftShadowMap,
    MeshLambertMaterial,
    PlaneGeometry,
    TextureLoader,
    Group,
    RepeatWrapping,
    CubeCamera
} from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import WebXRPolyfill from 'webxr-polyfill';
import TWEEN from '@tweenjs/tween.js/dist/tween.esm.js';

const cameraGroup = new Group();

const canvas = document.querySelector('canvas');
const renderer = new WebGLRenderer({ canvas: canvas, antialias: true });
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new Scene();
scene.name = "xrgarden"
window.scene = scene;
const camera = new PerspectiveCamera();
camera.far = 40;
cameraGroup.add(camera);
scene.add(cameraGroup);

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.5;
controls.target = new Vector3(0, 1, -5);
camera.position.set(0, 1.6, 0);
controls.update();

function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
window.addEventListener('resize', onWindowResize, false);
onWindowResize();

const light = new DirectionalLight(0xffaa33);
light.position.set(-10, 10, 10);
light.intensity = 1.0;
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 1;
light.shadow.camera.far = 30;
scene.add(light);

// Add the sun
light.add(
    new Mesh(new SphereGeometry(1, 32, 32), new MeshBasicMaterial({
        color: 0xffaa33
    }))
)

const light2 = new AmbientLight(0x003973);
light2.intensity = 1.0;
scene.add(light2);

const skygeometry = new SphereGeometry(25, 50, 50, 0, 2 * Math.PI);
const skymaterial = new MeshBasicMaterial();
skymaterial.side = BackSide;

// Nice sky with a bit of dithering to reduce banding.
skymaterial.onBeforeCompile = function (shader) {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n#define USE_UV');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
    #include <common>
    #define USE_UV
    float random (vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
    }
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec4 col1;
        vec4 col2;
        float mixAmount;
        if (vUv.y > 0.5) {
            col1 = vec4( 249, 229, 180, 1 ) / 255.0;
            col2 = vec4( 0, 57, 115, 1 ) / 255.0;
            float newY = (vUv.y - 0.5) * 2.0;
            mixAmount = sqrt(newY)*2.0;
        } else {
            col1 = vec4(0.6,0.6,0.6,1.0);
        }
        vec4 random4 = vec4((random(vUv)-0.5) * (1.4 / 255.0));
        diffuseColor *= mix(col1, col2, mixAmount) + random4;
    `);
};
const skysphere = new Mesh(skygeometry, skymaterial);
skysphere.name = 'skysphere';
scene.add(skysphere);

const floorTexture = new TextureLoader().load('https://cdn.glitch.com/3423c223-e1e5-450d-8cfa-2f5215104916%2Fmemphis-mini.png?v=1579618577700');
floorTexture.repeat.multiplyScalar(8);
floorTexture.wrapS = floorTexture.wrapT = RepeatWrapping;
const floor = new Mesh(
    new PlaneGeometry(50, 50, 50, 50),
    new MeshLambertMaterial({
        map: floorTexture
    })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.name = 'floor';
scene.add(floor);

new WebXRPolyfill();
document.body.appendChild( VRButton.createButton( renderer ) );

const rafCallbacks = new Set();
renderer.setAnimationLoop(function (time) {
    TWEEN.update(time);
    rafCallbacks.forEach(cb => cb(time));
    renderer.render(scene, camera);
});


const cubeCamera = new CubeCamera( 1, 100000, 128 );
const envMap = cubeCamera.renderTarget.texture;
scene.add( cubeCamera );
cubeCamera.update( renderer, scene );
function envMapUpdate (position) {
    if (position) cubeCamera.position.copy(position);
    cubeCamera.update( renderer, scene );
}

setTimeout(() => envMapUpdate(camera.getWorldPosition()), 3000);

export {
    renderer,
    scene,
    rafCallbacks,
    cameraGroup,
    camera,
    envMap,
    envMapUpdate
}