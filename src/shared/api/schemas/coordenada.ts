import { z } from 'zod'
import { decimal } from './comuns'

/** `dto/CoordenadaDto.java` */
export const coordenadaSchema = z.object({
  latitude: decimal,
  longitude: decimal,
})
export type Coordenada = z.infer<typeof coordenadaSchema>
