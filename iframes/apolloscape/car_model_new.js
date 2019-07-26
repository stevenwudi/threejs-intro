"use strict"; // good practice - see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
////////////////////////////////////////////////////////////////////////////////
// Smooth shading exercise: change program to make sphere look smooth
////////////////////////////////////////////////////////////////////////////////
/*global THREE, window, document, $*/

var camera, scene, renderer;
var cameraControls, effectController;
var clock = new THREE.Clock();
var ambientLight, light;
var meter_in_pixel = 100.;

//picking event
var projector;
var objects = [];
var canvasWidth;
var canvasHeight;
function json_read(filename){
    // The following is the validation file
    //var filename = "car_models/e2e_3d_car_101_FPN_triple_head_non_local/Oct02-11-35-29_N606-TITAN32_step/json_val_trans_iou_0.5_BBOX_AUG_multiple_scale_CAR_CLS_AUG_multiple_scale/171206_034625454_Camera_5.json";
    // This is the ground truth file
    //var filename = "car_poses/171206_034625454_Camera_5.json";
    var base_dir = "car_poses/";
    //var base_dir = "car_models/e2e_3d_car_101_FPN_triple_head_non_local/Oct02-11-35-29_N606-TITAN32_step/json_val_trans_iou_0.5_BBOX_AUG_multiple_scale_CAR_CLS_AUG_multiple_scale/";
    var file_path = base_dir + filename + ".json";

    var json = (function() {
        var json = null;
        $.ajax({
            'async': false,
            'global': false,
            'url': file_path,
            'dataType': "json",
            'success': function (data) {json = data;}
        });
        return json;
    })();

    return json;
}


function euler_angles_to_rotation_matrix(roll, pitch, yaw){
    var rollMatrix =  new THREE.Matrix3();
    var pitchMatrix =  new THREE.Matrix3();
    var yawMatrix = new THREE.Matrix3();

    rollMatrix.set(
        1, 0, 0,
        0, Math.cos(roll), -Math.sin(roll),
        0, Math.sin(roll), Math.cos(roll));

    pitchMatrix.set(
        Math.cos(pitch), 0, Math.sin(pitch),
        0, 1, 0,
        -Math.sin(pitch), 0, Math.cos(pitch));

    yawMatrix.set(
        Math.cos(yaw), -Math.sin(yaw), 0,
        Math.sin(yaw), Math.cos(yaw), 0,
        0, 0, 1);

    rollMatrix.multiply(pitchMatrix);
    rollMatrix.multiplyMatrices(yawMatrix);

    var matrix1 = new THREE.Matrix4();
    var matrix2 = new THREE.Matrix4();
    var matrix3 = new THREE.Matrix4();

    // matrix1.makeRotationX(roll);
    // matrix2.makeRotationY(pitch);
    // matrix3.makeRotationZ(yaw);
    // matrix1.multiply(matrix2);
    // matrix1.multiply(matrix3);

    return rollMatrix;
}

// How to position meshes while loading? (async problem) #1280
// https://github.com/mrdoob/three.js/issues/1280
function generateCallback( r1, r2, r3, t1, t2, t3) {

    return function( geometry ) {


       var car_instance = new THREE.Mesh( geometry, new THREE.MeshNormalMaterial({transparent: true, opacity: 1.0}));

        //var mesh = new THREE.Mesh( geometry, new THREE.MeshNormalMaterial({wireframe: true}));

        //var mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial({color: 0x3794cf}));
        //var car_instance = new THREE.Mesh( geometry,  new THREE.MeshBasicMaterial({color: 0x3794cf}));
        //var car_instance = new THREE.Object3D();
        //car_instance.add(mesh);
        // THREE js coordinate system, x and y axis are opposite from that of OpenCV
        if(r1 > Math.PI/2){
            r1 = -r1;
        }
        if(r3 < 0 && r3 > -Math.PI/2){
            r3 = -r3 ;
        }
        car_instance.eulerOrder = 'XYZ';
        car_instance.rotation.x = r1;
        car_instance.rotation.y = r2;
        car_instance.rotation.z = -r3 + Math.PI;

        // var rotationMatrix;
        // rotationMatrix = euler_angles_to_rotation_matrix(-r1+ 2*Math.PI, -r2 + 2*Math.PI, r3);
        // car_instance.applyMatrix(rotationMatrix);


        // var quaternion1 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(-1,0,0), r1 );
        // var quaternion2 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0,-1,0), r2);
        // var quaternion3 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0,0,1), r3);
        //
        // car_instance.rotation.setEulerFromQuaternion( quaternion1 );
        // car_instance.rotation.setEulerFromQuaternion( quaternion2 );
        // car_instance.rotation.setEulerFromQuaternion( quaternion3 );

        car_instance.position.x = -meter_in_pixel * t1;
        car_instance.position.y = -meter_in_pixel * t2;
        car_instance.position.z = meter_in_pixel * t3;

        car_instance.geometry.buffersNeedUpdate = true;
        car_instance.geometry.uvsNeedUpdate = true;

        scene.add(car_instance);
        objects.push(car_instance);
    };

}

// Your FOV slider should go in this function
// the value of the slider should be accessible globally via: effectController.fov
function setupGui() {
    effectController = {
        fov: 60,
        near: 20,
        far: 50000,
    };
    //gui.removeFolder('Camera manipulation')
    var f;

    var gui = new dat.GUI();

    f = gui.addFolder('Camera manipulation');

    f.add( effectController, "fov", 1.0, 179.0 ).name("Field of view");
    f.add( effectController, "near", 1.0, 50000).name("Near plane");
    f.add( effectController, "far", 100.0, 50000.0 ).name("Far plane");
}

function init() {
    // CAMERA
    // OrthographicCamera(left, right, top, bottom ,near far)
   //camera = new THREE.OrthographicCamera(-2000, 2000, -1000, 1000, 0, 10000);
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 80000 );
    camera.position.set( 0, 200, -500);
    camera.lookAt(0, 0, 0);
    // LIGHTS

    ambientLight = new THREE.AmbientLight( 0xFFFFFF );
    light = new THREE.DirectionalLight( 0xdddddd, 0.7 );
    light.position.set(0, 200, -500);

    // RENDERER
    renderer = new THREE.WebGLRenderer( {antialias: true } );
    renderer.setSize(window.innerWidth, window.innerHeight);

    var container = document.getElementById('container');
    container.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    // CONTROLS
   cameraControls = new THREE.OrbitAndPanControls( camera, renderer.domElement );
    // Scene
    scene = new THREE.Scene();
    setupGui();

    projector = new THREE.Projector();
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );

}

function onDocumentMouseDown( event ) {

    //event.preventDefault();

    // Annoying nested window code: need to subtract offsets for nested windows.
    // This is not needed if you have just a single window filling the browser
    // var node = event.target || event.srcElement;
    // var mouseX = event.clientX - node.offsetLeft;
    // var mouseY = event.clientY - node.offsetTop;


    // getBoundingClientRect()
    //   gives the element's position relative to the browser's visible viewport.
    // clientX/Y
    //   gives the mouse position relative to the browser's visible viewport.
    //
    // we then just have to find the difference between the two
    // to get the mouse position in "canvas-space"
    var canvasPosition = renderer.domElement.getBoundingClientRect();
    var mouseX = event.clientX - canvasPosition.left;
    var mouseY = event.clientY - canvasPosition.top;

    // console.log(canvasPosition.left,canvasPosition.top);
    // console.log(mouseX,mouseY);

    /*
    while (node.offsetParent){
        node = node.offsetParent;
        mouseX -= node.offsetLeft;
        mouseY -= node.offsetTop;
    }*/

    /* the old way */
    /*
    var mouseVector = new THREE.Vector3(
        2 * ( mouseX / canvasWidth ) - 1,
        1 - 2 * ( mouseY / canvasHeight ), 0.5 );
    projector.unprojectVector( mouseVector, camera );

    var raycaster = new THREE.Raycaster( camera.position, mouseVector.sub( camera.position ).normalize() );
    */

    /* the new way: simpler creation of raycaster */
    /* from tutorial: http://soledadpenades.com/articles/three-js-tutorials/object-picking/ */
    var mouseVector = new THREE.Vector3(
        2 * ( mouseX / canvasWidth ) - 1,
        1 - 2 * ( mouseY / canvasHeight ));
    // debug: console.log( "client Y " + event.clientY + ", mouse Y " + mouseY );

    var raycaster = projector.pickingRay( mouseVector.clone(), camera );

    var intersects = raycaster.intersectObjects( objects );

    if ( intersects.length > 0 ) {
        //intersects[0].object.material.color.setRGB( Math.random(), Math.random(), Math.random() );
        var opacity = intersects[0].object.material.opacity;
        if (opacity == 0.5){
            intersects[0].object.material.opacity = 1;
        }
        else
        {
            intersects[0].object.material.opacity = 0.5;
        }


        var sphere = new THREE.Mesh( sphereGeom, sphereMaterial );
        sphere.position = intersects[ 0 ].point;
        scene.add( sphere );
    }

    /*
    // Parse all the faces, for when you are using face materials
    for ( var i in intersects ) {
        intersects[ i ].face.material[ 0 ].color.setHex( Math.random() * 0xFFFFFF | 0x80000000 );
    }
    */
}


function fillScene(json) {

    // scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );
    // Read from a Json file with all the car poses:
    scene.add( ambientLight );
    scene.add( light );

    // Main loop here
    for (var i = 0; i < json.length; i++){
        var car_file = 'car_models/car_model_threejs/' + json[i].car_id.toString() + '.js';
        console.log(car_file);

        var loader = new THREE.JSONLoader();
        loader.load(car_file,
            generateCallback(json[i].pose[0], json[i].pose[1], json[i].pose[2],
                             json[i].pose[3], json[i].pose[4], json[i].pose[5]));
    }

    // thicker axes
    //Coordinates.drawAllAxes({axisLength:500,axisRadius:22,axisTess:200});
    // The X axis is red. The Y axis is green. The Z axis is blue.
    var worldAxis = new THREE.AxisHelper( 200 );
    scene.add( worldAxis );
}

function addToDOM() {
    var container = document.getElementById('container');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length>0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild( renderer.domElement );
}

function animate() {
    window.requestAnimationFrame( animate );
    render();
}

var theta = 0;
var radius = 600;
function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);

    // gui control update
    camera.fov = effectController.fov;
    camera.near = effectController.near;
    camera.far = effectController.far;
    camera.updateProjectionMatrix();

    // A nice effect for camera rotation
    // theta += 0.1;
    // camera.position.x = radius * Math.sin( THREE.Math.degToRad( theta ) );
    // camera.position.y = radius * Math.sin( THREE.Math.degToRad( theta ) );
    // camera.position.z = radius * Math.cos( THREE.Math.degToRad( theta ) );
    // camera.lookAt( scene.position );

    renderer.render( scene, camera );
}

function readURL(input) {
    if (input.files && input.files[0]) {
        // Load rgb images
        var reader = new FileReader();

        // This variable will define the ratin for RGB image
        var show_ration = 1/3;
        reader.onload = function (e) {
            $('#rgb_img')
                .attr('src', e.target.result)
                .width(3384 * show_ration)
                .height(2710 * show_ration);
        };
        reader.readAsDataURL(input.files[0]);

        // Display the full RGB name:
        var infoArea = document.getElementById( 'file-upload-filename' );
        // // use fileName however fits your app best, i.e. add it into a div
        var fileName = input.files[0].name;
        // use fileName however fits your app best, i.e. add it into a div
        infoArea.textContent = fileName;

        // load json car poses
        var json = json_read(input.files[0].name.split('.').slice(0, -1).join(''));

        try {
            init();
            fillScene(json);
            addToDOM();
            animate();
        } catch(e) {
            var errorReport = "Your program encountered an unrecoverable error, can not draw on canvas. Error was:<br/><br/>";
            $('#container').append(errorReport+e);
        }

    }
}