/** Alinhamento de decals ground ao normal do terreno (Fase 8). */



import { Euler, Quaternion, Vector3 } from 'three'



const _up = new Vector3(0, 0, 1)

const _normal = new Vector3()

const _quat = new Quaternion()

const _spin = new Quaternion()

const _euler = new Euler()



/**

 * Euler radianos Three: base Z-up → normal da superfície + spin extra em torno do normal.

 * @param spinRadians — rotação in-plane (eixo Z do frame ground).

 */

export function groundEulerFromSurfaceNormal(

  normal: [number, number, number],

  spinRadians = 0,

): [number, number, number] {

  _normal.set(normal[0], normal[1], normal[2])

  if (_normal.lengthSq() < 1e-8) _normal.set(0, 0, 1)

  _normal.normalize()



  if (_normal.dot(_up) > 0.999) {

    return [0, 0, spinRadians]

  }



  _quat.setFromUnitVectors(_up, _normal)

  if (Math.abs(spinRadians) > 1e-6) {

    _spin.setFromAxisAngle(_normal, spinRadians)

    _quat.multiply(_spin)

  }



  _euler.setFromQuaternion(_quat, 'XYZ')

  return [_euler.x, _euler.y, _euler.z]

}



export function shouldTiltToGroundNormal(normal: [number, number, number]): boolean {

  return Math.abs(normal[2] - 1) > 0.02 || Math.hypot(normal[0], normal[1]) > 0.05

}


