const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI / 2,
        Math.PI / 3,
        5,
        BABYLON.Vector3.Zero(),
        scene
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 0.5;
    camera.upperRadiusLimit = 10;

    // Lighting
    const hemiLight = new BABYLON.HemisphericLight(
        "hemiLight",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    hemiLight.intensity = 1.2;
    hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);
    hemiLight.specular = new BABYLON.Color3(1, 1, 1);
    hemiLight.groundColor = new BABYLON.Color3(0.8, 0.8, 0.8);

    const dirLight = new BABYLON.DirectionalLight(
        "dirLight",
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    dirLight.position = new BABYLON.Vector3(5, 10, 5);
    dirLight.intensity = 1.5;

    // Shadow generator
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGenerator.usePoissonSampling = true;
    shadowGenerator.bias = 0.0001;

    // Ground plane
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 10, height: 10 },
        scene
    );
    ground.position.y = -1;
    const groundMaterial = new BABYLON.PBRMaterial("groundMat", scene);
    groundMaterial.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.85);
    groundMaterial.metallic = 0.1;
    groundMaterial.roughness = 0.6;
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    return scene;
}

const scene = createScene();

let loadedModel = null; // Store the model for movement

function loadModel(filename) {
    const fileExtension = filename.split(".").pop().toLowerCase();
    if (fileExtension === "gltf" || fileExtension === "glb") {
        BABYLON.SceneLoader.ImportMesh(
            "",
            "./",
            filename,
            scene,
            function (meshes) {
                console.log("Model GLTF berhasil dimuat!", meshes);
                const model = meshes[0];
                loadedModel = model; // Store model for later use

                // Position model on ground
                const boundingInfo = model.getHierarchyBoundingVectors(true);
                const modelBottom = boundingInfo.min.y;
                model.position = new BABYLON.Vector3(0, -modelBottom + 1, 0);
                model.scaling = new BABYLON.Vector3(10, 10, 10); // Increased scale for visibility

                // Add shadows
                scene.getLightByName("dirLight").getShadowGenerator().addShadowCaster(model);

                // Center camera on model
                scene.getCameraByName("camera").setTarget(model.position);

                console.log("Model position:", model.position);
                console.log("Bounding info:", boundingInfo);
            },
            null,
            function (scene, message, exception) {
                console.error("Gagal memuat model:", message, exception);
                document.getElementById("modelInfo").innerText = "Gagal memuat model!";
            }
        );
    } else {
        console.error("Format tidak didukung:", fileExtension);
        document.getElementById("modelInfo").innerText = "Format tidak didukung!";
    }
}

// Click handler for moving the model
scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.pickInfo.hit) {
        const pickedMesh = pointerInfo.pickInfo.pickedMesh;
        if (pickedMesh && pickedMesh.name === "ground" && loadedModel) {
            const pickedPoint = pointerInfo.pickInfo.pickedPoint;
            const boundingInfo = loadedModel.getHierarchyBoundingVectors(true);
            const modelBottom = boundingInfo.min.y;

            // New position: keep y adjusted to ground, use x and z from click
            const newPosition = new BABYLON.Vector3(
                pickedPoint.x,
                -modelBottom + 1, // Adjust so model sits on ground (y = -1)
                pickedPoint.z
            );

            // Animate movement
            const animation = new BABYLON.Animation(
                "moveAnimation",
                "position",
                60, // FPS
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            const keys = [
                { frame: 0, value: loadedModel.position },
                { frame: 30, value: newPosition }
            ];
            animation.setKeys(keys);
            loadedModel.animations = [animation];
            scene.beginAnimation(loadedModel, 0, 30, false);

            console.log("Moving model to:", newPosition);
        }
    }
}, BABYLON.PointerEventTypes.POINTERDOWN);

loadModel("scene.gltf");

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());