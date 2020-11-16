/* CSCI 5619 Lecture 19, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Logger } from "@babylonjs/core/Misc/logger";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { Button3D } from "@babylonjs/gui/3D/controls/button3D"
import { HolographicButton } from "@babylonjs/gui/3D/controls/holographicButton"
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Animation } from "@babylonjs/core/Animations/animation"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture"
import { StackPanel3D } from "@babylonjs/gui/3D/controls/stackPanel3D"
import { PlanePanel } from "@babylonjs/gui/3D/controls/planePanel"
import { CylinderPanel } from "@babylonjs/gui/3D/controls/cylinderPanel"
import { SpherePanel } from "@babylonjs/gui/3D/controls/spherePanel"
import { ScatterPanel } from "@babylonjs/gui/3D/controls/scatterPanel"

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";

class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;
    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       var pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            skyboxSize: 50,
            skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the ground and skybox are not pickable!
        environment!.ground!.isPickable = false;
        environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation
        xrHelper.teleportation.dispose();

        // Create an animation to use for testing purposes
        var testAnimation = new Animation(
            "testAnimation", 
            "position", 75, 
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
            );

        var testAnimationKeys = [];
        testAnimationKeys.push({frame: 0, value: new Vector3(0, 4, 5)});
        testAnimationKeys.push({frame: 75, value: new Vector3(0, .5, 5)});
        testAnimation.setKeys(testAnimationKeys);

        var testSphere = MeshBuilder.CreateSphere("testSphere", {diameter: 1}, this.scene);
        testSphere.position = new Vector3(0, 3, 5);
        testSphere.animations.push(testAnimation);




        // Manually create a plane for adding static text
        var staticTextPlane = MeshBuilder.CreatePlane("textPlane", {}, this.scene);
        staticTextPlane.position.y = .1;
        staticTextPlane.isPickable = false;

        // Create a dynamic texture for adding GUI controls
        var staticTextTexture = AdvancedDynamicTexture.CreateForMesh(staticTextPlane, 512, 512);

        // Create a static text block
        var staticText = new TextBlock();
        staticText.text = "Hello world!";
        staticText.color = "white";
        staticText.fontSize = 12;
        staticTextTexture.addControl(staticText);

        // Assign the left and right controllers to member variables
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            if(inputSource.uniqueId.endsWith("right"))
            {
                this.rightController = inputSource;
            }
            else 
            {
                this.leftController = inputSource;

                // Add the static text plane as a child of the controller
                staticTextPlane.parent = this.leftController.pointer!;
            }  
        });

        // Don't forget to deparent objects from the controllers or they will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right")) 
            {
                staticTextPlane.parent = null;
            }
        });




        // The manager automates some of the GUI creation steps
        var guiManager = new GUI3DManager(this.scene);

        // Create a test button
        var testButton = new Button3D("testButton");
        guiManager.addControl(testButton);

        // This must be done after addControl to overwrite the default content
        testButton.position = new Vector3(0, 1.6, 3); 
        testButton.scaling.y = .5;   

        var testButtonTransform = new TransformNode("testButtonTransform", this.scene);
        testButtonTransform.rotation.y = 90 * Math.PI / 180;
        testButton.linkToTransformNode(testButtonTransform);

        // Create the test button text
        var testButtonText = new TextBlock();
        testButtonText.text = "Hello world!";
        testButtonText.color = "white";
        testButtonText.fontSize = 24;
        testButtonText.scaleY = 2;
        testButton.content = testButtonText;

        // Type cast the button material so we can change the color
        var testButtonMaterial = <StandardMaterial>testButton.mesh!.material;
       
        // Custom background color
        var backgroundColor = new Color3(.284, .73, .831);
        testButtonMaterial.diffuseColor = backgroundColor;
        testButton.pointerOutAnimation = () => {
            testButtonMaterial.diffuseColor = backgroundColor;
        }

        // Custom hover color
        var hoverColor = new Color3(.752, .53, .735);
        testButton.pointerEnterAnimation = () => {
            testButtonMaterial.diffuseColor = hoverColor;
        }

        // Start the animation when the button is selected
        testButton.onPointerDownObservable.add(() => {
            this.scene.beginAnimation(testSphere, 0, 75, false);
        });




        // Create a panel to automatically layout GUI controls
        // See: https://doc.babylonjs.com/divingDeeper/gui/gui3D

        //var panel = new StackPanel3D();
        //var panel = new PlanePanel();
        //var panel = new CylinderPanel();
        //var panel = new SpherePanel();
        var panel = new ScatterPanel();
        guiManager.addControl(panel);

        panel.position = new Vector3(0, 1.6, 3); 
        panel.margin = 0.25;
        panel.blockLayout = true;
        panel.rows = 4;
        
        // Create 20 holographic buttons
        for(let i=0; i < 20; i++)
        {
            let button = new HolographicButton("button");
            panel.addControl(button);

            let buttonText = new TextBlock();
            buttonText.text = "" + (i+1);
            buttonText.color = "white";
            buttonText.fontSize = 64;
            button.content = buttonText;  

            button.onPointerDownObservable.add(() => {
                this.scene.beginAnimation(testSphere, 0, 75, false);
            });
        }



        this.scene.debugLayer.show(); 
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
 
    }

}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();