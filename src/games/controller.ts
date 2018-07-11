import { 
  JsonController, Authorized, CurrentUser, Post, Get, Param, BodyParam, BadRequestError, ForbiddenError, NotFoundError, HttpCode, Patch
} from 'routing-controllers'
import User from '../users/entity'
import Question from '../questions/entity'
import { Game, Player } from './entities'
import {io} from '../index'

interface Update {
  answer: string 
  player: string
  question: number
}

@JsonController()
export default class GameController {

	@Authorized()
	@Get('/games')
	getGames() {
    // TODO: dont send the right answers to client
		return Game.find()
	}

  @Authorized()
  @Post('/games')
  @HttpCode(201)
  async createGame(
    @CurrentUser() user: User
  ) {
    // TODO: Load 10 random questions from Question
    const randomQuestions = await Question.find({ 
      take: 10
    })
   
    const entity = await Game.create({
      questions:randomQuestions
    }).save()
    
    await Player.create({
      game: entity, 
      user,
      player: 'a'
    }).save()

    const game = await Game.findOneById(entity.id)

    io.emit('action', {
      type: 'ADD_GAME',
      payload: game
    })
    return game
  }

  @Authorized()
  @Post('/games/:id([0-9]+)/players')
  @HttpCode(201)
  async joinGame(
    @CurrentUser() user: User,
    @Param('id') gameId: number
  ) {
    const game = await Game.findOneById(gameId)
    if (!game) throw new BadRequestError(`Game does not exist`)
    if (game.status !== 'pending') throw new BadRequestError(`Game is already started`)

    game.status = 'started'
    await game.save()

    const player = await Player.create({
      game, 
      user,
      player: 'b'
    }).save()

    io.emit('action', {
      type: 'UPDATE_GAME',
      payload: await Game.findOneById(game.id)
    })

    return player
  }

  // @Authorized()
  @Patch('/games/:id([0-9]+)')
  async updateGame(
    // @CurrentUser() user: User,
    @Param('id') gameId: number,
    @BodyParam("update") update: Update
  ) {
    const game = await Game.findOneById(gameId)
    if (!game) throw new NotFoundError(`Game does not exist`)
    
    //TODO: add all the validation: Questions can only be answered once etc....
    
    // const player = await Player.findOne({ user, game })
    // if (!player) throw new ForbiddenError(`You are not part of this game`)
    // if (game.status !== 'started') throw new BadRequestError(`The game is not started yet`)
    
    // add answer to givenAnswers: 
    game.givenAnswers.push(update)

    // Check if answer is the right answer, and update the score   
    update.answer === game.questions[game.currentQuestion].rightAnswer ? game.scores[update.player] += 5 : game.scores[update.player] -= 5

    // check if the game is finished
    if(game.currentQuestion >= 10){ game.status = 'finished' } else { game.currentQuestion += 1}

    // save game to database
    game.save()

    io.emit('action', {
      type: 'UPDATE_GAME',
      payload: game
    })

    return game
  }

  @Authorized()
  @Get('/games/:id([0-9]+)')
  getGame(
    @Param('id') id: number
  ) {
    return Game.findOneById(id)
  }  
}

