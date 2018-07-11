import { BaseEntity, PrimaryGeneratedColumn, Column, Entity, Index, OneToMany, ManyToOne, ManyToMany, JoinTable} from 'typeorm'
import User from '../users/entity'
import Question from '../questions/entity'

export type Status = 'pending' | 'started' | 'finished'
export type Players = 'a' | 'b' 

@Entity()
export class Game extends BaseEntity {

  @PrimaryGeneratedColumn()
  id?: number

  @Column('text', {nullable: true})
  winner: Players

  @Column('text', {default: 'pending'})
  status: Status

  @Column('integer', {default: 0})
  currentQuestion: number

  // Todo: make interface for givenAnswers
  @Column('json',{default: []})
  givenAnswers: Object[]

  // Todo: make interface for scores
  @Column('json',{default: {"a": 0, "b": 0}})
  scores: Object

	@OneToMany(_ => Player, player => player.game, {eager:true})
  players: Player[]
  
  @ManyToMany(_ => Question, questions => questions.games, {eager:true})
  @JoinTable()
  questions: Question[]
}

@Entity()
@Index(['game', 'user', 'answer'], {unique:true})
export class Player extends BaseEntity {

  @PrimaryGeneratedColumn()
  id?: number

  // @Column() // if compilation doesn't work, comment this two lines out, then compile again
  // userId: number

  player: Players

  @Column('char', {length: 1, nullable: true})
  answer: Symbol

  @ManyToOne(_ => User, user => user.players)
  user: User

  @ManyToOne(_ => Game, game => game.players)
  game: Game

}
