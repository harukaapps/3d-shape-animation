'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface CubeTrain {
  parent: THREE.Object3D;
  faces: THREE.Mesh[];
  startTime: number;
  spawnPosition: { x: number; z: number };
  spawnAngle: number;
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 5, 10);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Stats (FPS) setup
    const stats = new Stats();
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '0px';
    stats.dom.style.left = '0px';
    mountRef.current.appendChild(stats.dom);

    // GUI setup
    const gui = new GUI();
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '0px';
    gui.domElement.style.right = '0px';

    // OrbitControlsの設定
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // スムーズな動き
    controls.dampingFactor = 0.05;
    controls.minDistance = 5; // 最小ズーム距離
    controls.maxDistance = 30; // 最大ズーム距離
    controls.maxPolarAngle = Math.PI / 2; // 地面より下にはいかない
    controls.autoRotate = false; // 自動回転OFF

    // カメラコントロールの設定をGUIに追加
    const cameraFolder = gui.addFolder('Camera Controls');
    cameraFolder.add(controls, 'autoRotate').name('Auto Rotate');
    cameraFolder.add(controls, 'autoRotateSpeed', 0.1, 5, 0.1).name('Rotation Speed');
    cameraFolder.open();

    // イージング関数のコレクション
    const easingFunctions = {
      // 基本的な関数
      linear: (t: number) => t,
      easeInQuad: (t: number) => t * t,
      easeOutQuad: (t: number) => t * (2 - t),
      easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      
      // サイン関数ベース
      easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
      easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
      easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
      
      // 指数関数ベース
      easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
      easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
      easeInOutExpo: (t: number) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 
        Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
      
      // バウンス
      easeInBounce: (t: number) => 1 - easingFunctions.easeOutBounce(1 - t),
      easeOutBounce: (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
      },
      easeInOutBounce: (t: number) => t < 0.5 ? 
        (1 - easingFunctions.easeOutBounce(1 - 2 * t)) / 2 : 
        (1 + easingFunctions.easeOutBounce(2 * t - 1)) / 2,
      
      // エラスティック
      easeInElastic: (t: number) => t === 0 ? 0 : t === 1 ? 1 :
        -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
      easeOutElastic: (t: number) => t === 0 ? 0 : t === 1 ? 1 :
        Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
      easeInOutElastic: (t: number) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ?
        -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 :
        (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1,
      
      // サーキュラー
      easeInCirc: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
      easeOutCirc: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
      easeInOutCirc: (t: number) => t < 0.5 ?
        (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 :
        (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
    };

    // スポーンパターンのアルゴリズムコレクション
    const spawnPatterns = {
      // 円形スポーン
      circle: (angle: number, radius: number) => {
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius
        };
      },

      // スパイラル（渦巻き）
      spiral: (angle: number, radius: number) => {
        const spiralRadius = radius * (1 - angle / (Math.PI * 8));
        return {
          x: Math.cos(angle) * Math.max(spiralRadius, 0.5),
          z: Math.sin(angle) * Math.max(spiralRadius, 0.5)
        };
      },

      // 花びら型
      flower: (angle: number, radius: number) => {
        const petalCount = 5;
        const r = radius * Math.cos(petalCount * angle);
        return {
          x: r * Math.cos(angle),
          z: r * Math.sin(angle)
        };
      },

      // スター型
      star: (angle: number, radius: number) => {
        const points = 5;
        const innerRadius = radius * 0.4;
        const r = radius + (innerRadius - radius) * Math.cos(points * angle);
        return {
          x: r * Math.cos(angle),
          z: r * Math.sin(angle)
        };
      },

      // ハート型
      heart: (angle: number, radius: number) => {
        const t = angle - Math.PI / 2;
        const size = radius * 0.3;
        return {
          x: size * 16 * Math.pow(Math.sin(t), 3),
          z: size * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
        };
      },

      // 四角形
      square: (angle: number, radius: number) => {
        const normalizedAngle = ((angle + Math.PI / 4) % (Math.PI / 2)) - Math.PI / 4;
        const r = radius / Math.cos(normalizedAngle);
        return {
          x: r * Math.cos(angle),
          z: r * Math.sin(angle)
        };
      },

      // インフィニティ（∞）型
      infinity: (angle: number, radius: number) => {
        const a = radius * 0.7;
        const b = radius * 0.4;
        return {
          x: a * Math.cos(angle) / (1 + Math.pow(Math.sin(angle), 2)),
          z: b * Math.sin(angle) * Math.cos(angle) / (1 + Math.pow(Math.sin(angle), 2))
        };
      },

      // レムニスケート（蝶結び型）
      lemniscate: (angle: number, radius: number) => {
        const r = radius * Math.sqrt(Math.abs(Math.cos(2 * angle)));
        return {
          x: r * Math.cos(angle),
          z: r * Math.sin(angle)
        };
      },

      // 三角形
      triangle: (angle: number, radius: number) => {
        const triangleAngle = angle % (Math.PI * 2 / 3);
        const normalizedAngle = triangleAngle - Math.PI / 3;
        const r = radius / Math.cos(normalizedAngle);
        return {
          x: r * Math.cos(angle),
          z: r * Math.sin(angle)
        };
      },

      // ランダム
      random: (angle: number, radius: number) => {
        const randomRadius = radius * (0.5 + Math.random() * 0.5);
        const randomAngle = Math.random() * Math.PI * 2;
        return {
          x: randomRadius * Math.cos(randomAngle),
          z: randomRadius * Math.sin(randomAngle)
        };
      }
    };

    // シェイプジェネレーターのコレクション
    const shapeGenerators = {
      // 基本的な立方体
      cube: (size: number) => {
        const faces: THREE.Mesh[] = [];
        const materials = [
          new THREE.MeshPhongMaterial({ color: 0xff0000}), // Right
          new THREE.MeshPhongMaterial({ color: 0x00ff00 }), // Left
          new THREE.MeshPhongMaterial({ color: 0x0000ff }), // Top
          new THREE.MeshPhongMaterial({ color: 0xffff00 }), // Bottom
          new THREE.MeshPhongMaterial({ color: 0xff00ff }), // Front
          new THREE.MeshPhongMaterial({ color: 0x00ffff }), // Back
        ];

        for (let i = 0; i < 6; i++) {
          const geometry = new THREE.PlaneGeometry(size, size);
          const face = new THREE.Mesh(geometry, materials[i]);
          faces.push(face);
        }

        faces[0].position.x = size / 2;  // Right
        faces[0].rotation.y = Math.PI / 2;
        faces[1].position.x = -size / 2; // Left
        faces[1].rotation.y = -Math.PI / 2;
        faces[2].position.y = size / 2;  // Top
        faces[2].rotation.x = -Math.PI / 2;
        faces[3].position.y = -size / 2; // Bottom
        faces[3].rotation.x = Math.PI / 2;
        faces[4].position.z = size / 2;  // Front
        faces[5].position.z = -size / 2; // Back
        faces[5].rotation.y = Math.PI;

        return faces;
      },

      // 正四面体
      tetrahedron: (size: number) => {
        const geometry = new THREE.TetrahedronGeometry(size * 0.7);
        const materials = [
          new THREE.MeshPhongMaterial({ color: 0xff0000 }),
          new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
          new THREE.MeshPhongMaterial({ color: 0x0000ff }),
          new THREE.MeshPhongMaterial({ color: 0xffff00 }),
        ];
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 4;
          return face;
        });
        return faces;
      },

      // 正八面体
      octahedron: (size: number) => {
        const geometry = new THREE.OctahedronGeometry(size * 0.7);
        const materials = Array(8).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 8;
          return face;
        });
        return faces;
      },

      // 正十二面体
      dodecahedron: (size: number) => {
        const geometry = new THREE.DodecahedronGeometry(size * 0.7);
        const materials = Array(12).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 12;
          return face;
        });
        return faces;
      },

      // 正二十面体
      icosahedron: (size: number) => {
        const geometry = new THREE.IcosahedronGeometry(size * 0.7);
        const materials = Array(20).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 20;
          return face;
        });
        return faces;
      },

      // トーラス（ドーナツ型）
      torus: (size: number) => {
        const geometry = new THREE.TorusGeometry(size * 0.5, size * 0.2, 16, 32);
        const materials = Array(6).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 6;
          return face;
        });
        return faces;
      },

      // 球体
      sphere: (size: number) => {
        const geometry = new THREE.SphereGeometry(size * 0.5, 32, 32);
        const materials = Array(6).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 6;
          return face;
        });
        return faces;
      },

      // カプセル
      capsule: (size: number) => {
        const geometry = new THREE.CapsuleGeometry(size * 0.3, size * 0.6, 4, 8);
        const materials = Array(6).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
        const faces = materials.map((material, i) => {
          const face = new THREE.Mesh(geometry, material);
          face.rotation.y = (i * Math.PI * 2) / 6;
          return face;
        });
        return faces;
      },
    };

    // キューブの配列を管理
    const cubes: CubeTrain[] = [];
    const cubeControls = {
      rollDuration: 1.5,     // 1つのキューブの転がり時間
      cubeInterval: 0.05,    // キューブの生成間隔
      cubeSize: 1,          // キューブのサイズ
      moveDistance: 3,      // 移動距離
      maxCubes: 200,        // 最大キューブ数
      rotations: 4,         // 回転回数
      isSpawning: true,     // キューブ生成フラグ
      spawnRadius: 5,       // スポーン円の半径
      rotationSpeed: 1,     // スポーン位置の回転速度
      clockwise: true,      // 回転方向
      easingFunction: 'easeInOutQuad', // デフォルトのイージング関数
      moveEasingFunction: 'easeInOutQuad', // 移動用のイージング関数
      spawnPattern: 'circle', // デフォルトのスポーンパターン
      shapeType: 'cube'     // デフォルトのシェイプタイプ
    };
    let lastCubeTime = 0;
    let spawnAngle = 0;     // スポーン位置の角度

    // スポーン位置を計算する関数
    function calculateSpawnPosition(angle: number): { x: number; z: number } {
      const pattern = spawnPatterns[cubeControls.spawnPattern as keyof typeof spawnPatterns];
      return pattern(angle, cubeControls.spawnRadius);
    }

    // キューブ生成関数
    function createCube(): CubeTrain {
      const size = cubeControls.cubeSize;
      const faces = shapeGenerators[cubeControls.shapeType as keyof typeof shapeGenerators](size);
      const cubeParent = new THREE.Object3D();
      faces.forEach(face => cubeParent.add(face));
      scene.add(cubeParent);

      // スポーン位置を設定
      const spawnPos = calculateSpawnPosition(spawnAngle);
      cubeParent.position.set(spawnPos.x, 0, spawnPos.z);
      
      // キューブを中心に向けて回転
      cubeParent.lookAt(0, 0, 0);

      return {
        parent: cubeParent,
        faces: faces,
        startTime: time,
        spawnAngle: spawnAngle,
        spawnPosition: spawnPos,
      };
    }

    // キューブのコントロールパネル
    const cubeFolder = gui.addFolder('Cube Controls');
    cubeFolder.add(cubeControls, 'rollDuration', 0.5, 5.0, 0.1).name('Roll Duration');
    cubeFolder.add(cubeControls, 'cubeInterval', 0.05, 2.0, 0.05).name('Spawn Interval');
    cubeFolder.add(cubeControls, 'maxCubes', 1, 200, 1).name('Max Cubes');
    cubeFolder.add(cubeControls, 'rotations', 1, 10, 1).name('Rotations');
    cubeFolder.add(cubeControls, 'isSpawning').name('Enable Spawning');
    cubeFolder.add(cubeControls, 'clockwise').name('Clockwise Rotation');
    cubeFolder.add(cubeControls, 'easingFunction', Object.keys(easingFunctions)).name('Roll Easing');
    cubeFolder.add(cubeControls, 'moveEasingFunction', Object.keys(easingFunctions)).name('Move Easing');
    cubeFolder.add(cubeControls, 'shapeType', Object.keys(shapeGenerators)).name('Shape Type')
      .onChange(() => {
        // 既存のシェイプを全て削除
        cubes.forEach(cube => {
          cube.faces.forEach(face => {
            face.geometry.dispose();
            face.material.dispose();
            cube.parent.remove(face);
          });
          scene.remove(cube.parent);
        });
        cubes.length = 0;
        
        // スポーン角度をリセット
        spawnAngle = 0;
        lastCubeTime = time;
      });
    cubeFolder.open();

    // スポーンコントロールパネル
    const spawnFolder = gui.addFolder('Spawn Controls');
    spawnFolder.add(cubeControls, 'spawnRadius', 3, 10, 0.5).name('Spawn Radius');
    spawnFolder.add(cubeControls, 'rotationSpeed', 0.1, 5, 0.1).name('Rotation Speed');
    spawnFolder
      .add(cubeControls, 'spawnPattern', Object.keys(spawnPatterns))
      .name('Spawn Pattern')
      .onChange(() => {
        // 既存のキューブを全て削除
        cubes.forEach(cube => {
          cube.faces.forEach(face => {
            face.geometry.dispose();
            (face.material as THREE.Material).dispose();
            cube.parent.remove(face);
          });
          scene.remove(cube.parent);
        });
        cubes.length = 0;
        
        // スポーン角度をリセット
        spawnAngle = 0;
        lastCubeTime = time;
      });
    spawnFolder.open();

    // 光源の設定（UIは非表示）
    const light1 = new THREE.PointLight(0xffffff, 15);
    const light2 = new THREE.PointLight(0xffffff, 15);
    const light3 = new THREE.PointLight(0xffffff, 15);
    const light4 = new THREE.PointLight(0xffffff, 15);

    const lightGroup1 = new THREE.Group();
    const lightGroup2 = new THREE.Group();
    lightGroup1.add(light1);
    lightGroup1.add(light2);
    lightGroup2.add(light3);
    lightGroup2.add(light4);
    scene.add(lightGroup1, lightGroup2);

    // 光源の初期位置設定
    const radius = 1.5;
    const height = 0.5;
    
    light1.position.set(radius, height, 0);
    light2.position.set(-radius, height, 0);
    light3.position.set(0, height, radius);
    light4.position.set(0, height, -radius);

    // トップライト
    const topLight = new THREE.DirectionalLight(0xffffff, 2);
    topLight.position.set(0, 5, 0);
    scene.add(topLight);

    // アンビエントライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Animation
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.016;

      // OrbitControlsの更新
      controls.update();

      // スポーン角度を更新（回転方向に応じて正負を切り替え）
      spawnAngle += cubeControls.clockwise ? cubeControls.rotationSpeed * 0.05 : -cubeControls.rotationSpeed * 0.05;

      // 新しいキューブの生成
      if (cubeControls.isSpawning && 
          time - lastCubeTime > cubeControls.cubeInterval && 
          cubes.length < cubeControls.maxCubes) {
        const newCube = createCube();
        cubes.push(newCube);
        lastCubeTime = time;
      }

      // 各キューブのアニメーション更新
      cubes.forEach((cube, index) => {
        const cubeTime = time - cube.startTime;
        if (cubeTime > cubeControls.rollDuration) {
          if (index === 0 && cubes.length > cubeControls.maxCubes) {
            scene.remove(cube.parent);
            cube.faces.forEach(face => {
              face.geometry.dispose();
              (face.material as THREE.Material).dispose();
            });
            cubes.shift();
          }
          return;
        }

        // 経過時間の計算
        const elapsedTime = time - cube.startTime;
        const progress = Math.min(elapsedTime / cubeControls.rollDuration, 1);
        
        // イージング関数を適用
        const rollProgress = easingFunctions[cubeControls.easingFunction as keyof typeof easingFunctions](progress);
        const moveProgress = easingFunctions[cubeControls.moveEasingFunction as keyof typeof easingFunctions](progress);
        
        // 位置の更新（移動用のイージングを適用）
        const spawnPos = calculateSpawnPosition(cube.spawnAngle);
        const currentX = spawnPos.x * (1 - moveProgress);
        const currentZ = spawnPos.z * (1 - moveProgress);
        
        cube.parent.position.x = currentX;
        cube.parent.position.z = currentZ;
        
        // キューブを回転（回転用のイージングを適用）
        cube.parent.rotation.y = cube.spawnAngle;
        cube.parent.rotation.x = -rollProgress * Math.PI * cubeControls.rotations * (cubeControls.clockwise ? 1 : -1);
      });

      stats.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      mountRef.current?.removeChild(stats.dom);
      gui.destroy();
      cubes.forEach(cube => {
        scene.remove(cube.parent);
        cube.faces.forEach(face => {
          face.geometry.dispose();
          (face.material as THREE.Material).dispose();
        });
      });
      renderer.dispose();
    };
  }, []);

  return (
    <main className="min-h-screen">
      <div ref={mountRef} className="w-full h-screen" />
    </main>
  );
}