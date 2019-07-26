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

// How to position meshes while loading? (async problem) #1280
// https://github.com/mrdoob/three.js/issues/1280
function generateCallback( r1, r2, r3, t1, t2, t3,
                           m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15) {

    return function( geometry ) {

        /* this is body of callback */
        /* do something with value */
        //

        var mesh = new THREE.Mesh( geometry, new THREE.MeshNormalMaterial());
        // THREE js coordinate system, x and y axis are opposite from that of OpenCV
        //mesh.matrixAutoUpdate = false;
        //mesh.matrix.set(matrix.elements);

        var car_instance = new THREE.Object3D();
        car_instance.add(mesh);

        car_instance.matrixAutoUpdate = false;

        // var rotationAxis = new THREE.Vector3(0,0,1);
        // // makeRotationAxis wants its axis normalized
        // rotationAxis.normalize();
        // // don't use position, rotation, scale
        // car_instance.matrix.makeRotationAxis( rotationAxis, r3 );
        //
        // var rotationAxis = new THREE.Vector3(0,1,0);
        // // makeRotationAxis wants its axis normalized
        // rotationAxis.normalize();
        // // don't use position, rotation, scale
        // car_instance.matrix.makeRotationAxis( rotationAxis, r2 );
        //
        // var rotationAxis = new THREE.Vector3(1,0,0);
        // // makeRotationAxis wants its axis normalized
        // rotationAxis.normalize();
        // // don't use position, rotation, scale
        // car_instance.matrix.makeRotationAxis( rotationAxis, r1 );
        //
        // var euler = new THREE.Euler(r1, r2, r3, 'XYZ');
        // //car_instance.matrix.makeRotationFromEuler(euler);
        //
        // var quaternion = new THREE.Quaternion();
        // quaternion.setFromEuler(euler);
        //car_instance.matrix.makeRotationFromQuaternion(quaternion);
        //car_instance.matrix.set(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15);
        //car_instance.updateMatrix();

        //car_instance.matrix.set(m0, m4, m8, m12, m1, m5, m9, m13, m2, m6, m10, m14, m3, m7, m11, m15);
        //car_instance.matrix.set(matrix);
        //
        car_instance.matrix.makeTranslation(-meter_in_pixel * t1,
                                            -meter_in_pixel * t2,
                                            meter_in_pixel * t3);


        var matrix1 = new THREE.Matrix4();
        var matrix2 = new THREE.Matrix4();
        var matrix3 = new THREE.Matrix4();

        if(r1 > Math.PI/2){
            r1 = -r1;
        }
        if(r3 < 0 && r3 > -Math.PI/2){
            r3 = -r3 ;
        }
        matrix1.makeRotationX(r1);
        matrix2.makeRotationY(r2);
        matrix3.makeRotationZ(-r3 + Math.PI);

        car_instance.matrix.multiply(matrix1);
        car_instance.matrix.multiply(matrix2);
        car_instance.matrix.multiply(matrix3);
        //Rotate the mesh
        // if(r1 > Math.PI/2){
        //     r1 = -r1;
        // }
        // car_instance.rotation.x =  r1 ;
        // car_instance.rotation.y =  r2 ;
        // // if(r3 < 0 && r3 > -Math.PI/2){
        // //     r3 = -r3 ;
        // // }
        // car_instance.rotation.z =  -r3 + Math.PI ;
        //
        // car_instance.position.x = -meter_in_pixel * t1 ;
        // car_instance.position.y = -meter_in_pixel * t2 ;
        // car_instance.position.z = meter_in_pixel * t3 ;

        // opacity is dependent upon distance
        // var opacity = Math.max(0.5, 1 - t3/50);
        // mesh.material.transparent = true;
        // mesh.material.opacity = opacity;

        //mesh.rotateOnAxis(z, Math.PI);
        scene.add( car_instance );

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
    light = new THREE.DirectionalLight( 0xFFFFFF, 0.7 );
    light.position.set( -800, 900, 300 );

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
}

function fillScene(json) {

    // scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );
    // Read from a Json file with all the car poses:
    scene.add( ambientLight );
    scene.add( light );

    // Main loop here
    for (var i = 0; i < json.length; i++){
        var car_file = '../models/car_model_threejs/' + json[i].car_id.toString() + '.js';
        console.log(car_file);

        var matrix = new THREE.Matrix4();
        var matrix2 = new THREE.Matrix4();
        var matrix3 = new THREE.Matrix4();
        var matrix_t = new THREE.Matrix4();

        matrix_t.makeTranslation(-meter_in_pixel * json[i].pose[3], -meter_in_pixel * json[i].pose[4], meter_in_pixel * json[i].pose[5]);

        matrix.makeRotationX(json[i].pose[0]);
        matrix2.makeRotationY(json[i].pose[1]);
        matrix3.makeRotationZ(json[i].pose[2]);
        matrix.multiply(matrix2);
        matrix.multiply(matrix3);
        matrix.multiply(matrix_t);
        matrix.transpose();
        //matrix = matrix.transpose();
        //matrix1matrix.assign.makeRotationFromEuler(euler);
        //matrix.makeTranslation( -meter_in_pixel * json[i].pose[3], -meter_in_pixel * json[i].pose[4], meter_in_pixel * json[i].pose[5]);
        //matrix.makeTranslation(0, 0, 0);

        var loader = new THREE.JSONLoader();
        loader.load(car_file,
            generateCallback(json[i].pose[0], json[i].pose[1], json[i].pose[2],
                             json[i].pose[3], json[i].pose[4], json[i].pose[5],
                                matrix.elements[0], matrix.elements[1], matrix.elements[2], matrix.elements[3],
                                matrix.elements[4], matrix.elements[5], matrix.elements[6], matrix.elements[7],
                                matrix.elements[8], matrix.elements[9], matrix.elements[10], matrix.elements[11],
                                matrix.elements[12], matrix.elements[13], matrix.elements[14], matrix.elements[15]));
    }

    // Draw ground plane:
    var geometry = new THREE.PlaneGeometry(1000, 1000, 8, 8 );
    var material = new THREE.MeshBasicMaterial( {color: 0x3794cf, wireframe: true, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( geometry, material );

    plane.rotation.x = Math.PI/2;
    // Sink the ground
    plane.position.y = -300;
    //scene.add( plane );

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

function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);

    // gui control update
    camera.fov = effectController.fov;
    camera.near = effectController.near;
    camera.far = effectController.far;
    camera.updateProjectionMatrix();

    renderer.render( scene, camera );
}

function readURL(input) {
    if (input.files && input.files[0]) {
        // Load rgb images
        var reader = new FileReader();

        // This variable will define the ratio for RGB image
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