// ============================================================================
// 
// wgldCanvas2D.js
// 
// ============================================================================

function WC2D(canvas){
	// initialize check -------------------------------------------------------
	if(canvas == null || canvas.getContext == null){return null;}
	var gl = canvas.getContext('webgl', {preserveDrawingBuffer: true}) || 
			 canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});
	if(gl == null){return null;}
	
	// propertys initialize ---------------------------------------------------
	var vsSource = '\
		attribute vec3 position;\
		attribute vec3 normal;\
		attribute vec4 color;\
		uniform   mat4 mvpMatrix;\
		uniform   mat4 invMatrix;\
		uniform   vec3 lightDirection;\
		uniform   vec3 eyeDirection;\
		uniform   vec4 ambientColor;\
		varying   vec4 vColor;\
		void main(void){\
			vec3  invLight = normalize(invMatrix * vec4(lightDirection, 0.0)).xyz;\
			vec3  invEye   = normalize(invMatrix * vec4(eyeDirection, 0.0)).xyz;\
			vec3  halfLE   = normalize(invLight + invEye);\
			float diffuse  = clamp(dot(normal, invLight), 0.3, 1.0);\
			float specular = pow(clamp(dot(normal, halfLE), 0.0, 1.0), 50.0);\
			vColor         = color * vec4(vec3(diffuse), 1.0) *  ambientColor + vec4(vec3(specular), 0.0);\
			gl_Position    = mvpMatrix * vec4(position, 1.0);\
		}';
	
	var fsSource = '\
		precision mediump float;\
		varying vec4 vColor;\
		void main(void){\
			gl_FragColor = vColor;\
		}';
	
	var prg = null;
	var attL = ['position', 'normal', 'color'];
	var attS = [3, 3, 4];
	var uniL = ['mvpMatrix', 'invMatrix', 'lightDirection', 'eyeDirection', 'ambientColor'];
	var uniT = ['matrix4fv', 'matrix4fv', '3fv', '3fv', '4fv'];
	
	// vertices
	var sphereData = create_sphere(64, 64, 1.0, [1.0, 1.0, 1.0, 1.0]);
	var spherePosition = create_vbo(sphereData.position);
	var sphereNormal = create_vbo(sphereData.normal);
	var sphereColor = create_vbo(sphereData.color);
	var vboList = [spherePosition, sphereNormal, sphereColor];
	var sphereIndex = create_ibo(sphereData.index);
	var sphereIndexLength = sphereData.index.length;
	
	// shader initialize
	if(!shaderInit()){return null;}
	
	// gl initialize
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.BLEND);
	gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
	gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	var mat = new matIV();
	var mMatrix   = mat.identity(mat.create());
	var vMatrix   = mat.identity(mat.create());
	var pMatrix   = mat.identity(mat.create());
	var tmpMatrix = mat.identity(mat.create());
	var mvpMatrix = mat.identity(mat.create());
	var invMatrix = mat.identity(mat.create());
	var screenWidth = canvas.width;
	var camPosition = [0.0, 0.0, 309.0];
	var lightDirection = [0.577, 0.577, 0.577];
	mat.lookAt(camPosition, [0.0, 0.0, 0.0], [0.0, -1.0, 0.0], vMatrix);
	mat.perspective(45, 1.0, screenWidth - 100, screenWidth + 100, pMatrix);
	mat.multiply(pMatrix, vMatrix, tmpMatrix);
	
	// method over ride -------------------------------------------------------
	this.clearRect = function(x, y, w, h){
		if(gl != null){
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
	};
	
	this.beginPath = function(){};
	
	this.closePath = function(){};
	
	this.arc = function(x, y, size, arg4, arg5, arg6){
		if(gl != null){
			var w = screenWidth / 2;
			var tx = x - w;
			var ty = y - w;
			mat.identity(mMatrix);
			mat.translate(mMatrix, [-tx, ty, 0.0], mMatrix);
			mat.scale(mMatrix, [size, size, size], mMatrix);
			mat.multiply(tmpMatrix, mMatrix, mvpMatrix);
			mat.inverse(mMatrix, invMatrix);
			push_shader([
				mvpMatrix,
				invMatrix,
				lightDirection,
				camPosition,
				returnRGBA(this.fillStyle)
			]);
			gl.drawElements(gl.TRIANGLES, sphereIndexLength, gl.UNSIGNED_SHORT, 0);
		}
	};
	
	this.fill = function(){};
	
	this.draw = function(){
		if(gl != null){
			gl.flush();
		}
	}
	
	this.fillStyle = '';
	
	// utility functions ------------------------------------------------------
	function shaderInit(){
		var i;
		// shader
		var v = gl.createShader(gl.VERTEX_SHADER);
		var f = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(v, vsSource);
		gl.compileShader(v);
		gl.shaderSource(f, fsSource);
		gl.compileShader(f);
		if(!gl.getShaderParameter(v, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(v));
			return;
		}
		if(!gl.getShaderParameter(f, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(f));
			return;
		}
		
		// program
		prg = gl.createProgram();
		gl.attachShader(prg, v);
		gl.attachShader(prg, f);
		gl.linkProgram(prg);
		if(gl.getProgramParameter(prg, gl.LINK_STATUS)){
			gl.useProgram(prg);
		}else{
			alert(gl.getProgramInfoLog(prg));
			return;
		}
		
		// attribute
		for(i = 0; i < attL.length; i++){
			attL[i] = gl.getAttribLocation(prg, attL[i]);
			gl.bindBuffer(gl.ARRAY_BUFFER, vboList[i]);
			gl.enableVertexAttribArray(attL[i]);
			gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndex);
		
		// uniform
		for(i = 0; i < uniL.length; i++){
			uniL[i] = gl.getUniformLocation(prg, uniL[i]);
		}
		
		return true;
	}
	
	function create_vbo(data){
		var vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		return vbo;
	};
	
	function create_ibo(data){
		var ibo = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		return ibo;
	};
	
	function push_shader(any){
		var i;
		for(i = 0, l = uniT.length; i < l; i++){
			switch(uniT[i]){
				case 'matrix4fv':
					gl.uniformMatrix4fv(uniL[i], false, any[i]);
					break;
				case '4fv':
					gl.uniform4fv(uniL[i], any[i]);
					break;
				case '3fv':
					gl.uniform3fv(uniL[i], any[i]);
					break;
				case '2fv':
					gl.uniform2fv(uniL[i], any[i]);
					break;
				case '1fv':
					gl.uniform1fv(uniL[i], any[i]);
					break;
				case '1f':
					gl.uniform1f(uniL[i], any[i]);
					break;
				case '1iv':
					gl.uniform1iv(uniL[i], any[i]);
					break;
				case '1i':
					gl.uniform1i(uniL[i], any[i]);
					break;
				default :
					break;
			}
		}
	};
	
	function create_sphere(row, column, rad, color){
		var i, j;
		var pos = new Array(), nor = new Array(),
		    col = new Array(), st  = new Array(),
		    idx = new Array();
		for(i = 0; i <= row; i++){
			var r = Math.PI / row * i;
			var ry = Math.cos(r);
			var rr = Math.sin(r);
			for(j = 0; j <= column; j++){
				var tr = Math.PI * 2 / column * j;
				var tx = rr * rad * Math.cos(tr);
				var ty = ry * rad;
				var tz = rr * rad * Math.sin(tr);
				var rx = rr * Math.cos(tr);
				var rz = rr * Math.sin(tr);
				if(color){
					var tc = color;
				}else{
					tc = hsva(360 / row * i, 1, 1, 1);
				}
				pos.push(tx, ty, tz);
				nor.push(rx, ry, rz);
				col.push(tc[0], tc[1], tc[2], tc[3]);
				st.push(1 - 1 / column * j, 1 / row * i);
			}
		}
		r = 0;
		for(i = 0; i < row; i++){
			for(j = 0; j < column; j++){
				r = (column + 1) * i + j;
				idx.push(r, r + 1, r + column + 2);
				idx.push(r, r + column + 2, r + column + 1);
			}
		}
		var obj = {};
		obj.position = pos;
		obj.normal   = nor;
		obj.color    = col;
		obj.texCoord = st;
		obj.index    = idx;
		return obj;
	}
	
	function returnRGBA(source){
		var i, j = 1.0 / 255;
		var s = source.replace(/[^0-9.,]/g, '');
		var v = s.split(',');
		for(i = 0; i < 3; i++){
			v[i] = parseInt(v[i]) * j;
		}
		v[3] = parseFloat(v[3]);
		return v;
	}
}
