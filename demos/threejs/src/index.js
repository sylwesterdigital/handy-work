import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { PlaneBufferGeometry } from 'three';
import { PlaneGeometry } from 'three';

import {
    update as handyWorkUpdate,
    loadPose
} from "handy-work/build/esm/handy-work.js";

import fistHandpose from 'handy-work/poses/fist.handpose';
import relaxHandpose from 'handy-work/poses/relax.handpose';
import flatHandpose from 'handy-work/poses/flat.handpose';
import pointHandpose from 'handy-work/poses/point.handpose';
import shakaHandpose from 'handy-work/poses/shaka.handpose';
import vulcanHandpose from 'handy-work/poses/vulcan.handpose';
import hornsHandpose from 'handy-work/poses/horns.handpose';

loadPose('fist', fistHandpose);
loadPose('relax', relaxHandpose);
loadPose('flat', flatHandpose);
loadPose('point', pointHandpose);
loadPose('shaka', shakaHandpose);
loadPose('vulcan', vulcanHandpose);
loadPose('horns', hornsHandpose);


let camera, scene, renderer;
let controls;

let xrRefSpace;

let hand1, hand2;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let rainbowStickMaterial
let stickGeometry2
let stickMaterial2


const handModels = {
    left: null,
    right: null
};

function initControllers() {

    // controllers
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory();


    // Hand 1
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    hand1 = renderer.xr.getHand(0);
    hand1.userData.currentHandModel = 0;
    scene.add(hand1);

    handModels.left = [
        handModelFactory.createHandModel(hand1, 'boxes'),
        handModelFactory.createHandModel(hand1, 'spheres'),
        handModelFactory.createHandModel(hand1, 'mesh')
    ];
    for (let i = 0; i < 3; i++) {
        const model = handModels.left[i];
        model.visible = i == 0;
        hand1.add(model);
    }

    hand1.addEventListener('pinchend', function() {
        console.log('hand1 pinched')
        handModels.left[this.userData.currentHandModel].visible = false;
        this.userData.currentHandModel = (this.userData.currentHandModel + 1) % 3;
        handModels.left[this.userData.currentHandModel].visible = true;
    });

    // Hand 2
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    hand2 = renderer.xr.getHand(1);
    hand2.userData.currentHandModel = 0;
    scene.add(hand2);

    handModels.right = [
        handModelFactory.createHandModel(hand2, 'boxes'),
        handModelFactory.createHandModel(hand2, 'spheres'),
        handModelFactory.createHandModel(hand2, 'mesh')
    ];

    for (let i = 0; i < 3; i++) {
        const model = handModels.right[i];
        model.visible = i == 0;
        hand2.add(model);
    }

    hand2.addEventListener('pinchend', function() {
        console.log('hand2 pinched')
        handModels.right[this.userData.currentHandModel].visible = false;
        this.userData.currentHandModel = (this.userData.currentHandModel + 1) % 3;
        handModels.right[this.userData.currentHandModel].visible = true;
    });



    // Rainbow Vertex Shader
    const rainbowVertexShader = `
        varying vec2 vUvRainbow;
        void main() {
            vUvRainbow = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    // Rainbow Fragment Shader with a Moving Gradient
    const rainbowFragmentShader = `
        uniform float rainbowTime;
        varying vec2 vUvRainbow;
        vec3 rainbowColor(float h) {
            return clamp( abs( mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0 ) -1.0, 0.0, 1.0 );
        }
        void main() {
            float hue = mod(vUvRainbow.y - rainbowTime * 0.99, 1.0);
            gl_FragColor = vec4(rainbowColor(hue), 1.0);
        }
    `;


    // Create a Rainbow ShaderMaterial using the above shaders
    rainbowStickMaterial = new THREE.ShaderMaterial({
        vertexShader: rainbowVertexShader,
        fragmentShader: rainbowFragmentShader,
        uniforms: {
            rainbowTime: { value: 0.0 } // Uniform value for the rainbow movement over time
        }
    });

    const stickHolder1 = new THREE.Group();
    const stickGeometry1 = new THREE.BoxGeometry(0.1, 0.1, 5);
    const stickMaterial1 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const stick1 = new THREE.Mesh(stickGeometry1, rainbowStickMaterial);

    stick1.position.z = -2.5;
    stickHolder1.add(stick1);
    controller1.add(stickHolder1);


    const stickHolder2 = new THREE.Group();
    stickGeometry2 = new THREE.BoxGeometry(0.1, 0.1, 5, 20, 20, 100); // 10 segments on each axis
    //const stickMaterial2 = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    let rippleStickUniforms = {
        rippleTime: { value: 0 }
    };

    stickMaterial2 = new THREE.ShaderMaterial({
        vertexShader: `
                uniform float rippleTime;
                varying vec2 rippleUv;
                void main() {
                    rippleUv = uv.xy;
                    vec3 pos = position;
                    pos.x += 0.1 * sin(10.0 * rippleUv.x + rippleTime) * sin(5.0 * rippleUv.y + rippleTime);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
        fragmentShader: `
                varying vec2 rippleUv;
                void main() {
                    gl_FragColor = vec4(rippleUv, 0.0, 1.0);
                }
            `,
        uniforms: rippleStickUniforms
    });

    const stick2 = new THREE.Mesh(stickGeometry2, stickMaterial2);
    stick2.position.z = -2.5;
    stickHolder2.add(stick2);
    controller2.add(stickHolder2);

}





function onXRSessionStart() {
    const session = renderer.xr.getSession();
    console.log("onSessionStart session", session);
    session.requestReferenceSpace('local').then((referenceSpace) => {
        xrRefSpace = referenceSpace;
    });
}

function onXRSessionEnd() {
    console.log("onSessionEnd")
    if (renderer.xr.isPresenting) {
        renderer.xr.end();
    }
}

function init() {

    const container = document.createElement('div');
    document.body.appendChild(container);
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000); // Extended far clip
    camera.position.z = 4;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x777777, 0.2, 20); // white fog that starts at 10 units and ends at 50 units.

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x777777, 1); // Sets the background color to white with 50% opacity
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.addEventListener('sessionstart', onXRSessionStart);
    renderer.xr.addEventListener('sessionend', onXRSessionEnd);

    container.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // ORBIT CONTROLS
    controls = new OrbitControls(camera, container);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2.06; // This is already the default, means camera can't go more than 90 degrees.        
    controls.minDistance = 1; // The closest the camera can get to the target
    controls.maxDistance = 15; // The farthest the camera can be from the target

    // FLOOR
    const floorGeometry = new THREE.PlaneGeometry(4, 4);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // LIGHTS
    scene.add(new THREE.HemisphereLight(0xbcbcbc, 0xa5a5a5, 3));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(0, 1, 0);
    light.castShadow = true;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = -2;
    light.shadow.camera.right = 2;
    light.shadow.camera.left = -2;
    light.shadow.mapSize.set(4096, 4096);
    scene.add(light);


    initControllers();

    window.addEventListener('resize', onWindowResize, false);

    animate();

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function poseDetected(posesAndDistances) {
    console.log("poseDetected:", posesAndDistances)
}

function render(timeStamp, xrFrame) {
    controls.update();
    const hand1 = renderer.xr.getHand(0);
    const hand2 = renderer.xr.getController(1);


    if (xrFrame && xrRefSpace && hand1 && hand2) {

    let hands = xrFrame.session.inputSources.filter(inputSource => !!inputSource.hand)
    //console.log("test", hands)


        handyWorkUpdate([hands[0], hands[1]], xrRefSpace, xrFrame, poseDetected);
    }
    renderer.render(scene, camera);
}

function animate() {
    renderer.setAnimationLoop(render);
}

init();