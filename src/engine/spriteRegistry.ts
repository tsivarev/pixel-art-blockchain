import { SpriteSheet, buildGridFrames } from './spriteSheet'

export class SpriteRegistry {
  private readonly terrain = new SpriteSheet('/sprites/terrain.png')
  private readonly buildings = new SpriteSheet('/sprites/buildings.png')
  private readonly characters = new SpriteSheet('/sprites/characters.png')
  private readonly frames = new Map<string, HTMLCanvasElement>()

  async load(): Promise<void> {
    await this.terrain.load(
      buildGridFrames(
        2048,
        2048,
        4,
        4,
        [
          'terrain_grass_a',
          'terrain_grass_b',
          'terrain_road',
          'terrain_road_v',
          'terrain_corner_ne',
          'terrain_corner_nw',
          'terrain_corner_se',
          'terrain_corner_sw',
          'terrain_t_up',
          'terrain_t_down',
          'terrain_t_left',
          'terrain_t_right',
          'terrain_cross',
          'terrain_stone_alt',
          'terrain_water',
          'terrain_dark',
        ],
        {
          inset: 12,
          targetW: 16,
          targetH: 16,
          removeCheckerboard: false,
          autoTrim: false,
        },
      ),
    )

    await this.buildings.load(
      buildGridFrames(
        2656,
        1600,
        5,
        2,
        [
          'building_master',
          'building_shard_0',
          'building_shard_1',
          'building_shard_2',
          'building_shard_3',
          'building_construct_0',
          'building_construct_1',
          'building_construct_2',
          'building_construct_3',
          'building_construct_4',
        ],
        {
          inset: 8,
          targetW: 32,
          targetH: 48,
          removeCheckerboard: true,
          autoTrim: true,
        },
      ),
    )

    const characterNames: string[] = []
    const courierDirs: Array<'down' | 'left' | 'right' | 'up'> = ['down', 'left', 'right', 'up']
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (row < 4 && col < 4) {
          characterNames.push(`char_courier_${courierDirs[row]}_${col}`)
        } else if (row === 4 && col < 2) {
          characterNames.push(`char_validator_${col}`)
        } else {
          characterNames.push(`char_misc_${row}_${col}`)
        }
      }
    }
    await this.characters.load(
      buildGridFrames(1696, 2528, 8, 8, characterNames, {
        inset: 6,
        targetW: 16,
        targetH: 24,
        removeCheckerboard: true,
        autoTrim: true,
      }),
    )

    const frameNames = [
      'terrain_grass_a',
      'terrain_grass_b',
      'terrain_road',
      'terrain_stone',
      'terrain_water',
      'terrain_dark',
      'building_master',
      'building_shard_0',
      'building_shard_1',
      'building_shard_2',
      'building_shard_3',
      'building_construct_0',
      'building_construct_1',
      'building_construct_2',
      'building_construct_3',
      'building_construct_4',
      'char_validator_0',
      'char_validator_1',
      'char_courier_down_0',
      'char_courier_down_1',
      'char_courier_down_2',
      'char_courier_down_3',
      'char_courier_up_0',
      'char_courier_up_1',
      'char_courier_up_2',
      'char_courier_up_3',
      'char_courier_left_0',
      'char_courier_left_1',
      'char_courier_left_2',
      'char_courier_left_3',
      'char_courier_right_0',
      'char_courier_right_1',
      'char_courier_right_2',
      'char_courier_right_3',
    ]

    for (const name of frameNames) {
      if (name === 'terrain_stone') {
        this.frames.set(name, this.terrain.getFrame('terrain_stone_alt'))
      } else {
        const frame = this.safeGet(name)
        if (frame) this.frames.set(name, frame)
      }
    }
  }

  getFrame(name: string): HTMLCanvasElement {
    const frame = this.frames.get(name)
    if (!frame) {
      throw new Error(`Frame "${name}" is not loaded`)
    }
    return frame
  }

  private safeGet(name: string): HTMLCanvasElement | null {
    try {
      if (name.startsWith('terrain_')) return this.terrain.getFrame(name)
      if (name.startsWith('building_')) return this.buildings.getFrame(name)
      if (name.startsWith('char_')) return this.characters.getFrame(name)
      return null
    } catch {
      return null
    }
  }
}
