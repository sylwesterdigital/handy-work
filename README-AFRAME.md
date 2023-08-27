# AFrame Handy Controls

The controls provide the ability to render hands and attach objects to individual joints.

It also fires events for when poses have been held for certain lengths of time.

The following are exposed on the component itself so you can hook into the library

* handyWorkUpdate
* dumpHands
* loadPose
* setPose 
* getPose 

Use the following properties to customise the component

<!--SCHEMA-->
<!--SCHEMA_END-->

Child entities with the `data-left`, `data-right` or `data-none` properties have their position and 
rotation set to match the tracked points from the WebXR API:

`data-left` and `data-right` are used for tracked hands or controllers where the hardware has controllers
which are explicity handed. i.e. Oculus Quest. Some hardware has a single ambiguously handed controller
this will be exposed as `data-none` because it has no handedness.  Screen based transient inputs will also
be exposed under `data-none`.

* grip (where someone would hold an object)
* ray (the target ray space from WebXR)
* screen-0 (1st transient input)
* screen-1 (2nd transient input)
* screen-2 (3rd transient input)
* screen-n ({n+1}th transient input)

* wrist
* thumb-metacarpal
* thumb-phalanx-proximal
* thumb-phalanx-distal
* thumb-tip
* index-finger-metacarpal
* index-finger-phalanx-proximal
* index-finger-phalanx-intermediate
* index-finger-phalanx-distal
* index-finger-tip
* middle-finger-metacarpal
* middle-finger-phalanx-proximal
* middle-finger-phalanx-intermediate
* middle-finger-phalanx-distal
* middle-finger-tip
* ring-finger-metacarpal
* ring-finger-phalanx-proximal
* ring-finger-phalanx-intermediate
* ring-finger-phalanx-distal
* ring-finger-tip
* pinky-finger-metacarpal
* pinky-finger-phalanx-proximal
* pinky-finger-phalanx-intermediate
* pinky-finger-phalanx-distal
* pinky-finger-tip

### Events

The component and each child emit events when they happen these events are

#### Standard WebXR API Events

* "select"
* "selectstart"
* "selectend"
* "squeeze"
* "squeezeend"
* "squeezestart"

#### Poses

* pose_[name]
* pose_[name]_fuseShort
* pose_[name]_fuseLong

Where name is one of the poses in `/poses`

You can see what the currently detected pose is by listening for `"pose"` events and inspecting `"event.detail.pose"`

#### Gamepad Events

These are very hardware dependent. If it is able to get access to the input profile data from the WebXR
input profiles repo then this will fire off events as named in that. Such as thumbstickmoved or a-buttondown x-buttonup. 

Otherwise it will just fire events like button0down button0up or axes0moved

To find out what a particular piece of hardware is using listen for `"gamepad"` events and inspect the `event.detail.event`.

### Magnetic Actions

Add data-magnet is set to the classname for elements it's to be drawn to in a magnetic fashion so that when the joint approaches that element the whole hand will get pulled towards it and aligned with the element.

Only set 1 `data-magnet` per hand. You can configure the magnetic elements by setting their data-magnet range e.g. `data-magnet-range="0.2,0.1,120,80"`. Where the first number is where the magnetism starts and the second the range at which the hand is totally moved to the destination location. The second set of numbers are how aligned the hand needs to be before magnetism starts (degrees between 0 and 360) , where the second number is what counts as fully aligned. In that example, which is the default it will start approaching from 0.2m and if the hand is within 0.1m it will be placed on the `#sword` handle.

For physics systems it probably won't work well when you use magnet elements you probably want to use the real joint location, do declare an additional that a joint should ignore magnet effects add `data-no-magnet` to it.

The object currently attracting the controller will have it's ID noted on the `data-magnet` element as a `data-magnet-target` which you can read in JavaScript through the object's dataset.

The magnet finding function always picks the first element it detects in it's range. Not the closest element. You can
sort the order magnets are tested by setting the `data-magnet-priority` property on elements. The default value is `1` if you want it to be low priority set `data-magnet-priority="0"` or lower like `"-1"` fractions are fine too. If you want it to be higher priority set it to a higher number such as `data-magnet-priority="10"`. 

```html
<!-- inside the handy-controls -->
<a-entity data-right="grip" data-magnet="magnet"></a-entity>
<a-entity data-left="grip" data-magnet="magnet"></a-entity>

<!-- Elsewhere in the scene -->
<a-gltf-model class="magnet" id="sword" src="#sword-gltf" data-magnet-range="0.2,0.1,120,80"></a-gltf-model>
```

### Example use case:

```html
<!-- After the AFrame script -->
<script src="https://cdn.jsdelivr.net/npm/handy-work/build/handy-controls.min.js"></script>

<!-- In your camera rig -->
<a-entity handy-controls="right:#right-gltf;materialOverride:right;" material="color:gold;metalness:1;roughness:0;">

  <!-- Screen space inputs like mobile AR -->
  <a-torus radius="0.008" radius-tubular="0.001" material="shader:flat;color:blue" data-none="screen-0"></a-torus>
  <a-torus radius="0.008" radius-tubular="0.001" material="shader:flat;color:green" data-none="screen-1"></a-torus>
  <a-torus radius="0.008" radius-tubular="0.001" material="shader:flat;color:red" data-none="screen-2"></a-torus>
  
  <!-- Objects attached to tracked hand joints -->
  <a-gltf-model src="#watch-gltf" data-left="wrist" position="-1000 0 0">
    <a-sphere radius="0.02" position="0 0.02 0" sphere-collider="radius:0.02;objects:[data-right$=-tip];" exit-on="hitend" visible="false"></a-sphere>
  </a-gltf-model>
  <a-entity data-left="ring-finger-phalanx-proximal">
    <a-torus position="0 0 -0.03" radius="0.008" radius-tubular="0.001" scale="1 1 1.5" material="color:gold;metalness:1;roughness:0;"></a-torus>
  </a-entity>
  
  <a-entity data-right="index-finger-tip" mixin="blink" blink-controls="rotateOnTeleport:false;startEvents:pose_point_fuseShort;endEvents:pose_point_fuseLong;"></a-entity>
  <a-entity data-left="index-finger-tip"  mixin="blink" blink-controls="rotateOnTeleport:false;startEvents:pose_point_fuseShort;endEvents:pose_point_fuseLong;"></a-entity>
  
  <!-- Ray and Grip are Available on Hands or Tracked Inputs -->
  <a-entity data-right="ray" mixin="blink" blink-controls>
    <a-entity position="0 0 -0.22" class="pose-label" text="value: Hello World; align: center;"></a-entity>
  </a-entity>
  <a-entity data-left="ray" mixin="blink" blink-controls>
    <a-entity position="0 0 -0.22" class="pose-label" text="value: Hello World; align: center;"></a-entity>
  </a-entity>

  <!-- These act like anchors pulling both hands and controllers towards grabable objects, moving the whole hand and the attached elements-->
  <a-entity id="right-magnet" data-right="grip" data-magnet=".magnet-right:not([data-no-magnet]),.magnet:not([data-no-magnet])" grab-magnet-target="startEvents:squeezestart,pose_fist;stopEvents:pose_flat_fuseShort,squeezeend;"></a-entity>
  <a-entity id="left-magnet" data-left="grip"  data-magnet=".magnet-left:not([data-no-magnet]),.magnet:not([data-no-magnet])"  grab-magnet-target="startEvents:squeezestart,pose_fist;stopEvents:pose_flat_fuseShort,squeezeend;"></a-entity>

  <!-- Markers to let us know the real location of the hands -->
  <a-sphere id="right-no-magnet" data-right="grip" data-no-magnet radius="0.01" color="red"></a-sphere>
  <a-sphere id="left-no-magnet" data-left="grip" data-no-magnet radius="0.01" color="red"></a-sphere>
  
  <!-- Invisible objects at the tips of each finger for physics or intersections -->
  <a-sphere data-right="index-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-right="middle-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-right="ring-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-right="pinky-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-right="thumb-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-left="index-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-left="middle-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-left="ring-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-left="pinky-finger-tip" radius="0.01" visible="false"></a-sphere>
  <a-sphere data-left="thumb-tip" radius="0.01" visible="false"></a-sphere>
</a-entity>
```

## Magnet Helpers

In `magnet-helpers.js` you can find a few helpful components for dealing with the magnetic behaviour for advanced hand interactions.


<!--SCHEMA2-->
<!--SCHEMA2_END-->
