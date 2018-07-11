import { BaseEntity, PrimaryGeneratedColumn, Column, Entity, ManyToMany } from 'typeorm'
import {Game} from '../games/entities'

@Entity()
export default class Question extends BaseEntity {

  @PrimaryGeneratedColumn()
  id?: number

  @Column('text')
  question: string

  @Column('json')
  answers: Array<Object>
	
  @Column('text')
  rightAnswer: string

  @ManyToMany(_ => Game, games => games.questions)
  games: Array<Game>
}
