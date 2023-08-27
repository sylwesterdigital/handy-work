import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { PlaneBufferGeometry } from 'three';
import { PlaneGeometry } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


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


function traverseAndLog(obj) {
  if (obj && obj.children && obj.children.length > 0) {
    obj.children.forEach(child => {
      console.log(child);
      traverseAndLog(child);
    });
  }
}



const handModels = {
    left: null,
    right: null
};

let handModelFactory;

function initControllers() {

    // controllers
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();
    handModelFactory = new XRHandModelFactory();


    // Hand 1
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    hand1 = renderer.xr.getHand(0);
    hand1.userData.currentHandModel = 0;
    scene.add(hand1);


    console.log(hand1)
    //traverseAndLog(window.hand1);


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


    window.hand1 = hand1;
    window.hand2 = hand2;



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
    //controller1.add(stickHolder1);


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
    //controller2.add(stickHolder2);

}




/* Audio */




// const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// // Define our notes frequencies (for this example, we'll use C Major scale)
// const frequencies = [
//   261.63,  // C
//   293.66,  // D
//   329.63,  // E
//   349.23,  // F
//   392.00,  // G
//   440.00,  // A
//   493.88,  // B
//   523.25   // C (next octave)
// ];

// let arpSpeed = 0.2;
// let oscillators = [];
// let currentInterval = null;  // To store the current looping interval

// function playNote(freq, time, duration = arpSpeed) {
//     const oscillator = audioContext.createOscillator();
//     oscillator.type = 'sine';  
//     oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
//     oscillator.connect(audioContext.destination);
//     oscillator.start(time);
//     oscillator.stop(time + duration);
    
//     oscillators.push(oscillator);
//     oscillator.onended = function() {
//         const index = oscillators.indexOf(oscillator);
//         if (index > -1) {
//             oscillators.splice(index, 1);
//         }
//     };

//     return oscillator;
// }

// function stopAllNotes() {
//     for (let oscillator of oscillators) {
//         oscillator.stop();
//     }
//     oscillators = [];
// }

// function stopSequenceLoop() {
//     if (currentInterval) {
//         clearInterval(currentInterval);
//         currentInterval = null;
//     }
// }

// function arpeg(soundNum, speed) {
//   stopAllNotes();
//   stopSequenceLoop();  // Clear any ongoing interval
//   arpSpeed = speed;

//   if (soundNum < 0 || soundNum >= frequencies.length) {
//     console.error("Invalid sound number!");
//     return;
//   }

//   const playSequence = () => {
//     // Play the note and the next three in sequence
//     for (let i = 0; i < 4; i++) {
//       const noteIndex = (soundNum + i) % frequencies.length;  
//       const time = audioContext.currentTime + i * arpSpeed;
//       playNote(frequencies[noteIndex], time);
//     }
//   }

//   // Immediately play the sequence and then set it to repeat
//   playSequence();
//   currentInterval = setInterval(playSequence, 4 * arpSpeed * 1000);  // Looping every 4 notes
// }

// function stopArp() {
//     stopAllNotes();
//     stopSequenceLoop();
// }


const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const frequencies = [
    261.63,  // C
    293.66,  // D
    329.63,  // E
    349.23,  // F
    392.00,  // G
    440.00,  // A
    493.88,  // B
    523.25   // C (next octave)
];

let arpSpeed = 0.2;
let activeOscillators = [];
let currentStep = 0;
let currentSequence = [0, 0, 0, 3, 0, 0, 0, 7];  // Default sequence
let intervalId;

window.arpSpeed = arpSpeed;

function playNote(freq) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + arpSpeed);
    activeOscillators.push(oscillator);

    oscillator.onended = () => {
        const index = activeOscillators.indexOf(oscillator);
        if (index > -1) {
            activeOscillators.splice(index, 1);
        }
    };
}

function stopAllNotes() {
    activeOscillators.forEach(osc => osc.stop());
    activeOscillators = [];
}

function tick() {
    const noteIndex = currentSequence[currentStep % currentSequence.length];
    playNote(frequencies[noteIndex]);
    currentStep++;
}

function arpeg(startStep = 0) {
    stopAllNotes();
    clearInterval(intervalId);
    currentStep = startStep;
    tick();  // Play the first note immediately
    intervalId = setInterval(tick, arpSpeed * 1000);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];  // Swap elements
    }
    return array;
}

function changeSequence() {
    currentSequence = shuffleArray([...Array(8).keys()]);  // Shuffling an array [0,1,2,...,7]
}


function stopArp() {
    clearInterval(intervalId);
    stopAllNotes();
    changeSequence(0);  // Reset sequence to play the same note repeatedly
    arpeg(0);
}

// Example usage:
// arpeg();  // Starts the default sequence
// changeSequence(3);  // Updates sequence to start from the 3rd step
// stopArp();  // Stops the sequence and starts playing the same note repeatedly


window.arpeg = arpeg;
window.stopArp = stopArp;
window.changeSequence = changeSequence;



let stationaryHand;
let controller3;

let thirdHandModel1;
let handGroup1

let thirdHandModel2;
let handGroup2

let mixer
let hoverClip

function addHand() {

  const gltfLoader = new GLTFLoader();
  
  //const thirdHandURL1 = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/left.glb';
  const thirdHandURL1 = './models/skeleton/monstro2.glb'
  const thirdHandURL2 = './models/bird-baked.glb'
  
  
  // handGroup1 = new THREE.Group();
  // scene.add(handGroup1);  


  
  handGroup2 = new THREE.Group();
  scene.add(handGroup2);  
  
  gltfLoader.load(thirdHandURL1, (gltf) => {

      thirdHandModel1 = gltf.scene;
      //thirdHandModel1.rotation.x = THREE.MathUtils.degToRad(90);  // Adjust the hand's orientation so it's palm is facing downwards.
      //thirdHandModel1.rotation.y = THREE.MathUtils.degToRad(-90);  // Adjust the hand's orientation so it's palm is facing downwards.
      
      //handGroup1.add(thirdHandModel1);

      scene.add(thirdHandModel1)

      thirdHandModel1.scale.set(10,10,10)


      //thirdHandModel.position.set(0, 1, -1);
  });
  
  gltfLoader.load(thirdHandURL2, (gltf) => {
      thirdHandModel2 = gltf.scene;
      mixer = new THREE.AnimationMixer(thirdHandModel2);
      //thirdHandModel2.rotation.x = THREE.MathUtils.degToRad(90);  // Adjust the hand's orientation so it's palm is facing downwards.
      //thirdHandModel2.rotation.y = THREE.MathUtils.degToRad(-90);  // Adjust the hand's orientation so it's palm is facing downwards.
      handGroup2.add(thirdHandModel2);
      thirdHandModel2.scale.set(5, 5, 5);
      hoverClip = THREE.AnimationClip.findByName(gltf.animations, 'hover');
      let hoverAction = mixer.clipAction(hoverClip);
      hoverAction.play();      
      //thirdHandModel2.position.set(0, 1, -1);
  });

}


const clock = new THREE.Clock();
let delta;

function updateMixer() {

  if(!mixer || !clock) return;

  delta = clock.getDelta();
  //console.log(delta)

  mixer.update(delta);

}


/*


Skeleton joint: 
A skeleton joint for a given hand can be uniquely identified by a skeleton joint name, which is an enum of type XRHandJoint.
A skeleton joint may have an associated bone that it is named after and used to orient its -Z axis. The associated bone of a skeleton joint is the bone that comes after the joint when moving towards the fingertips. The tip and wrist joints have no associated bones.
A skeleton joint has a radius which is the radius of a sphere placed at its center so that it roughly touches the skin on both sides of the hand. The "tip" skeleton joints SHOULD have an appropriate nonzero radius so that collisions with the fingertip may work. Implementations MAY offset the origin of the tip joint so that it can have a spherical shape with nonzero radius.


Wrist wrist 0
wrist 0

Thumb 1
Metacarpal  thumb-metacarpal  1
Proximal Phalanx  thumb-phalanx-proximal  2
Distal Phalanx  thumb-phalanx-distal  3
Tip thumb-tip 4

Index finger
Metacarpal  index-finger-metacarpal 5
Proximal Phalanx  index-finger-phalanx-proximal 6
Intermediate Phalanx  index-finger-phalanx-intermediate 7
Distal Phalanx  index-finger-phalanx-distal 8
Tip index-finger-tip  9

Middle finger
Metacarpal  middle-finger-metacarpal  10
Proximal Phalanx  middle-finger-phalanx-proximal  11
Intermediate Phalanx  middle-finger-phalanx-intermediate  12
Distal Phalanx  middle-finger-phalanx-distal  13
Tip middle-finger-tip 14

Ring finger
Metacarpal  ring-finger-metacarpal  15
Proximal Phalanx  ring-finger-phalanx-proximal  16
Intermediate Phalanx  ring-finger-phalanx-intermediate  17
Distal Phalanx  ring-finger-phalanx-distal  18
Tip ring-finger-tip 19

Little finger
Metacarpal  pinky-finger-metacarpal 20
Proximal Phalanx  pinky-finger-phalanx-proximal 21
Intermediate Phalanx  pinky-finger-phalanx-intermediate 22
Distal Phalanx  pinky-finger-phalanx-distal 23
Tip pinky-finger-tip  24


*/


const jointToModelBoneMapping = {

    'wrist': 0,

    'thumb-metacarpal': 1,
    'thumb-phalanx-proximal': 2,
    'thumb-phalanx-distal': 3,
    'thumb-tip': 4,
    
    'index-finger-metacarpal': 5,
    'index-finger-phalanx-proximal': 6,
    'index-finger-phalanx-intermediate': 7,
    'index-finger-phalanx-distal': 8,
    'index-finger-tip': 9,
    
    'middle-finger-metacarpal': 10,
    'middle-finger-phalanx-proximal': 11,
    'middle-finger-phalanx-intermediate': 12,
    'middle-finger-phalanx-distal': 13,
    'middle-finger-tip': 14,
    
    'ring-finger-metacarpal': 15,
    'ring-finger-phalanx-proximal': 16,
    'ring-finger-phalanx-intermediate': 17,
    'ring-finger-phalanx-distal': 18,
    'ring-finger-tip': 19,
    
    'pinky-finger-metacarpal': 20,
    'pinky-finger-phalanx-proximal': 21,
    'pinky-finger-phalanx-intermediate': 22,
    'pinky-finger-phalanx-distal': 23,
    'pinky-finger-tip': 24

};



function updateLeftHand(controller1Hand, xrFrame, referenceSpace) {
    if (!thirdHandModel1 || !xrFrame || !controller1Hand || !controller1) return;
    for (let jointName in jointToModelBoneMapping) {
        const joint = controller1Hand.get(jointName);  
        const jointPose = xrFrame.getJointPose(joint, referenceSpace);
        const modelBone = thirdHandModel1.children[0].children.find(child => child.name === jointName && child instanceof THREE.Bone);
        if (jointPose && modelBone) {
            modelBone.quaternion.copy(jointPose.transform.orientation);
            modelBone.position.copy(jointPose.transform.position);
        }
    }
}




function updateHand(controller1Hand, xrFrame, referenceSpace) {

  
    if (!thirdHandModel1 || !xrFrame || !controller1Hand || !controller1 || !controller2) return;
  
    //handGroup2.rotation.copy(controller2.rotation);
    handGroup2.rotation.y = controller2.rotation.y;
    //handGroup2.rotation.z = controller2.rotation.z;
  
    handGroup2.position.copy(controller2.position);
    handGroup2.position.y += 0.5;
    handGroup2.position.x += 0.5;
  
    //handGroup1.rotation.copy(controller1.rotation);
    //handGroup1.position.copy(controller1.position);
    //thirdHandModel1.rotation.copy(controller1.rotation);
    //thirdHandModel1.position.copy(controller1.position);
  
    for (let jointName in jointToModelBoneMapping) {
        const joint = controller1Hand.get(jointName);  
        const jointPose = xrFrame.getJointPose(joint, referenceSpace);
        // Access the corresponding bone in the thirdHandModel using the provided mapping
        const modelBone = thirdHandModel1.children[0].children.find(child => 
            child.name === jointName && child instanceof THREE.Bone
        );
        // If both jointPose and the model bone are valid, update the position of the model bone
        if (jointPose && modelBone) {
            modelBone.position.copy(jointPose.transform.position);
            // If you also want to copy rotation, ensure jointPose.transform.rotation is of Quaternion type
            //modelBone.quaternion.copy(jointPose.transform.rotation);
        }
    }
    
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

let canvas, ctx, texture
// Assuming poses is the array of pose names
const poses = ['fist','relax', 'flat', 'point', 'shaka', 'vulcan', 'horns'];





function init() {

    const container = document.createElement('div');
    document.body.appendChild(container);
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000); // Extended far clip
    camera.position.z = 4;

    scene = new THREE.Scene();
    // scene.fog = new THREE.Fog(0x777777, 0.2, 20); // white fog that starts at 10 units and ends at 50 units.


    // Gradient Creation
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 2560; 

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);


    gradient.addColorStop(0, '#FFFFFF'); // Sky color
    gradient.addColorStop(0, '#FFFCC9'); // Sky color
    gradient.addColorStop(0.2, '#FFCBA4'); // Sky color
    gradient.addColorStop(0.5, '#402E1D'); // Sky color
    gradient.addColorStop(1, '#000000'); // Sky color

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradientTexture = new THREE.CanvasTexture(canvas);

    // Skybox
    const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: gradientTexture,
        side: THREE.BackSide // View the texture from inside the sphere
    });
    const skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skySphere);  

    
    // const canvas = document.createElement('canvas');
    // canvas.width = 2;
    // canvas.height = 2;

    // const ctx = canvas.getContext('2d');
    // const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // gradient.addColorStop(0, '#ADD8E6'); // start with white
    // gradient.addColorStop(0.5, '#001440'); // end with pastel blue
    // gradient.addColorStop(1, '#000000'); // start with white

    // ctx.fillStyle = gradient;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    // scene.background = new THREE.CanvasTexture(canvas);


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
    const floorGeometry = new THREE.PlaneGeometry(2, 2);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.set(0,0,0)
    //scene.add(floor);

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

    addGUI()

    initControllers();

    addHand();

    window.addEventListener('resize', onWindowResize, false);

    animate();

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function addGUI() {

  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'navy';
  ctx.fillRect(0, 0, canvas.width, canvas.height);  

  let dpr = window.devicePixelRatio || 1;  // Get device pixel ratio

  let heightFac = 0.75;

  canvas.width = 1024 * dpr;  // Scale by device pixel ratio
  canvas.height = 1024 * dpr * heightFac;

  ctx.scale(dpr, dpr);  // Ensure all your draw commands are scaled

  texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  //texture.magFilter = THREE.LinearFilter;

  let maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.anisotropy = maxAnisotropy;

  const material = new THREE.MeshBasicMaterial({ map: texture });
  const tablePlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5*heightFac), material); // Adjust size as needed
  tablePlane.position.set(0,1,-4);

  scene.add(tablePlane);
}



let mostProbablePoseLeft = '';
let mostProbablePoseRight = '';

let gradientOffset = 0;

function updateGUI(mostProbablePoseLeft, mostProbablePoseRight) {

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set the background to navy blue
    ctx.fillStyle = '#001440';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let gradientLeft = ctx.createLinearGradient(20, 0, 480, 0);
    let gradientRight = ctx.createLinearGradient(520, 0, 980, 0);

    const colors = ["black", "#010101", "black"];

    for (let i = 0; i < 2 * colors.length; i++) {
        let position = (i / (2 * colors.length - 1) + gradientOffset) % 1;
        gradientLeft.addColorStop(position, colors[i % colors.length]);
        gradientRight.addColorStop(position, colors[i % colors.length]);
    }

    // Set table headers
    ctx.font = "40px Helvetica";
    ctx.fillStyle = "#D147A3";
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.fillText("Left Hand", 100, 80);
    ctx.fillText("Right Hand", 600, 80);

    for (let i = 0; i < poses.length; i++) {
        const posY = 200 + i * 80;

        if (poses[i] === mostProbablePoseLeft) {
            ctx.fillStyle = gradientLeft;
            ctx.fillRect(20, posY - 40, 460, 80);
            ctx.fillStyle = "yellow"; // Color for probable pose text
            ctx.fillText(poses[i], 100, posY);
        } else {
            ctx.fillStyle = "white";
            ctx.fillText(poses[i], 100, posY);
        }

        if (poses[i] === mostProbablePoseRight) {
            ctx.fillStyle = gradientRight;
            ctx.fillRect(520, posY - 40, 460, 80);
            ctx.fillStyle = "yellow"; // Color for probable pose text
            ctx.fillText(poses[i], 600, posY);
        } else {
            ctx.fillStyle = "white";
            ctx.fillText(poses[i], 600, posY);
        }
    }

    texture.needsUpdate = true;

    gradientOffset += 0.01; // Update gradient offset
    if (gradientOffset > 1) gradientOffset -= 1; // Loop offset in [0, 1] range
}




// function updateGUI(mostProbablePoseLeft, mostProbablePoseRight) {

//   ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

//   // Set table headers
//   ctx.font = "40px Helvetica"; // Doubled the font size
//   ctx.fillStyle = "#D147A3";
//   // Improved text rendering
//   ctx.textBaseline = 'middle';
//   ctx.textAlign = 'left';

//   ctx.fillText("Left Hand", 100, 80); // Doubled the positions

//   ctx.fillText("Right Hand", 600, 80); // Doubled the positions
//   ctx.fillStyle = "white";

//   // Iterate over poses and draw them for both hands
//   for(let i = 0; i < poses.length; i++) {
      
//       const posY = 200 + i * 80; // Doubled the starting Y and spacing
      
//       if(poses[i] === mostProbablePoseLeft) {
//           ctx.fillStyle = "#D147A3";
//           ctx.fillRect(20, posY - 40, 460, 80); // Doubled dimensions
//       }
      
//       ctx.fillStyle = "white";
//       ctx.fillText(poses[i], 100, posY);

//       if(poses[i] === mostProbablePoseRight) {
//           ctx.fillStyle = "#D147A3";
//           ctx.fillRect(520, posY - 40, 460, 80); // Doubled dimensions
//       }
      
//       ctx.fillStyle = "white";
//       ctx.fillText(poses[i], 600, posY);
//   }

//   texture.needsUpdate = true; // This is important to update the texture in Three.js
// }






function poseDetected(posesAndDistances) {
    const distances = posesAndDistances.distances;

    let minDistancePose = distances[0];
    distances.forEach(pose => {
        if (pose[1] < minDistancePose[1]) {
            minDistancePose = pose;
        }
    });

    if (posesAndDistances.handedness === 'left') {
        mostProbablePoseLeft = minDistancePose[0];
    } else if (posesAndDistances.handedness === 'right') {
        mostProbablePoseRight = minDistancePose[0];
    }

    updateGUI(mostProbablePoseLeft, mostProbablePoseRight);
}



function render(timeStamp, xrFrame) {

    controls.update();
  
    updateMixer();

    if (xrFrame && xrRefSpace) {
        const inputSourcesArray = [...xrFrame.session.inputSources];
        const hands = inputSourcesArray.filter(inputSource => inputSource && inputSource.hand);
        
        if (hands.length > 0 && hands[0].hand) {
            updateLeftHand(hands[0].hand, xrFrame, xrRefSpace);
        }

        handyWorkUpdate(hands, xrRefSpace, xrFrame, poseDetected);
    }

    renderer.render(scene, camera);
}



function animate() {
    renderer.setAnimationLoop(render);
}

init();