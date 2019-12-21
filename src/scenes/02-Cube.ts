import { Scene } from '../common/game';
import ShaderProgram from '../common/shader-program';
import Mesh from '../common/mesh';
import * as MeshUtils from '../common/mesh-utils';
import Camera from '../common/camera';
import FlyCameraController from '../common/camera-controllers/fly-camera-controller';
import { vec3, mat4, quat } from 'gl-matrix';
import { createElement, StatelessProps, StatelessComponent } from 'tsx-create-element';
var count:number = 0;
var oldrandom:number=0

// In this scene we will draw one colored cube in 3D
// The goal of this scene is to learn about:
// 1- Back face culling
export default class CubeScene extends Scene {
    program: ShaderProgram;
    meshes: {[name: string]: Mesh} = {};
    transdirx: {[index: number]: number}={};
    transdiry: {[index: number]: number}={};
    transdirz: {[index: number]: number}={};
    scalex: {[index: number]: number}={};
    scaley: {[index: number]: number}={};
    scalez:  {[index: number]: number}={};
    camera: Camera;
    controller: FlyCameraController;
    textures: {[name: string]: WebGLTexture} = {};
    anisotropy_ext: EXT_texture_filter_anisotropic; // This will hold the anisotropic filtering extension
    anisotropic_filtering: number = 0; // This will hold the maximum number of samples that the anisotropic filtering is allowed to read. 1 is equivalent to isotropic filtering.


    public load(): void {
        this.game.loader.load({
            ["texture.vert"]:{url:'shaders/texture.vert', type:'text'},
            ["texture.frag"]:{url:'shaders/texture.frag', type:'text'},
            ["moon-texture"]:{url:'shaders/sk3.jpg', type:'image'},
            ["cloud"]:{url:'models/Obstacles/cloud.obj', type:'text'}
            
        });
    } 
    
    public start(): void {
        this.program = new ShaderProgram(this.gl);
        this.program.attach(this.game.loader.resources["texture.vert"], this.gl.VERTEX_SHADER);
        this.program.attach(this.game.loader.resources["texture.frag"], this.gl.FRAGMENT_SHADER);
        this.program.link();

        //this.mesh = MeshUtils.LoadOBJMesh(this.gl,this.game.loader.resources["cloud"]);
        this.meshes['moon'] = MeshUtils.Cube(this.gl)

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);  
        this.textures['moon'] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['moon']);
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 4);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.game.loader.resources['moon-texture']);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        // Instead of using a sampler, we send the parameter directly to the texture here.
        // While we prefer using samplers since it is a clear separation of responsibilities, anisotropic filtering is yet to be supported by sampler and this issue is still not closed on the WebGL github repository.  
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
          // To keep things organized, we will use two classes we create to handle the camera
        // The camera class contains all the information about the camera
        // The controller class controls the camera

        this.anisotropy_ext = this.gl.getExtension('EXT_texture_filter_anisotropic');
        // The device does not support anisotropic fltering, the extension will be null. So we need to check before using it.
        // if it is supported, we will set our default filtering samples to the maximum value allowed by the device.
        if(this.anisotropy_ext) this.anisotropic_filtering = this.gl.getParameter(this.anisotropy_ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);

        this.camera = new Camera();
        this.camera.type = 'perspective';
        this.camera.position = vec3.fromValues(-2, 2, -2);
        this.camera.direction = vec3.fromValues(2, -2, 2);
        this.camera.aspectRatio = this.gl.drawingBufferWidth/this.gl.drawingBufferHeight;
        
        //this.controller = new FlyCameraController(this.camera, this.game.input);
        //this.controller.movementSensitivity = 0.005;

        // Uncomment the following lines to tell WebGL to use Back-face culling
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK); // This tells WebGL that we will remove the back faces
        this.gl.frontFace(this.gl.CCW); // This tells WebGL that the faces with Counter Clock Wise vertices (relative to the screen) are the front faces

        this.gl.clearColor(0,0,0,1);

        for(let i=0;i<100;i++)
        {
            this.transdirx[i]= this.randomInt(0, 50);
            this.transdiry[i]= this.randomInt(0, 970);
            this.transdirz[i]=50-this.transdirx[i];
            this.scalex[i]=this.randomInt(0, 5);
            this.scaley[i]=this.randomInt(0,5);
            this.scalez[i]=this.randomInt(0,5);        
        }
    }
  
    randomInt(min, max){
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    public draw(deltaTime: number): void {
        //this.controller.update(deltaTime);
        
            
        
        
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        this.program.use();
        for (let i = 0; i < 100; i++) {

        let tvec = vec3.fromValues(this.transdirx[i],this.transdiry[i],this.transdirz[i]);        //Need to be randomized
        let svec = vec3.fromValues(this.scalex[i],this.scaley[i],this.scalez[i]);        //Need to be randomized
        let rotAngle =0;
        let rvec = quat.fromValues(0,0,0,Math.cos(rotAngle/2)); 
        let M = mat4.create();
        mat4.fromRotationTranslation(M, rvec, tvec);
        mat4.fromRotationTranslationScale(M,rvec,tvec,svec);
        let VP = this.camera.ViewProjectionMatrix; // We get the VP matrix from our camera class
        
        let MVP = mat4.create();
        mat4.mul(MVP, VP, M);

        this.program.setUniformMatrix4fv("MVP", false, MVP);
        this.program.setUniform4f("tint", [1, 1, 1, 1]);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['moon']);
        this.program.setUniform1i('texture_sampler', 0);
        // If anisotropic filtering is supported, we send the parameter to the texture paramters.
        if(this.anisotropy_ext) this.gl.texParameterf(this.gl.TEXTURE_2D, this.anisotropy_ext.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic_filtering);

        this.meshes['moon'].draw(this.gl.TRIANGLES);
    }
    }
    
    public end(): void {
        this.program.dispose();
        this.program = null;
        this.meshes['moon'].dispose();
        this.meshes['moon'] = null;
    }

}