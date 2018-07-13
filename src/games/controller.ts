const Trivia = require('trivia-api')
const trivia = new Trivia({ encoding: 'base64' });
import { 
  JsonController, Authorized, CurrentUser, Post, Get, Param, BodyParam, BadRequestError, ForbiddenError, NotFoundError, HttpCode, Patch
} from 'routing-controllers'
import User from '../users/entity'
// import Question from '../questions/entity'
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
    @CurrentUser() user: User,
    @BodyParam("options") cOptions
  ) {
    // TODO: Load 10 random questions from Question
    // const randomQuestions = await Question.find({ 
    //   take: 10
    // })

      
      
    let options = {
      category: +cOptions.category,
      type: 'multiple',
      amount: 10,
      difficulty: cOptions.difficulty
    };

    console.log(options);
    

    let questions = await trivia.getQuestions(options)

    questions.results.map(question=>question.answers=question.incorrect_answers.push(question.correct_answer))

    
  
    const entity = await Game.create({
      questions: questions.results
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
		console.log("Join Game Controller works!")
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

  @Authorized()
  @Patch('/games/:id([0-9]+)')
  async updateGame(
    @CurrentUser() user: User,
    @Param('id') gameId: number,
    @BodyParam("update") update: Update
  ) {
    const game = await Game.findOneById(gameId)
    if (!game) throw new NotFoundError(`Game does not exist`)
    
    //TODO: add validation: Questions can only be answered once etc....

    const player = await Player.findOne({ user, game })
    if (!player) throw new ForbiddenError(`You are not part of this game`)
    if (game.status !== 'started') throw new BadRequestError(`The game is not started yet`)
    
    // add answer to givenAnswers: 
    game.givenAnswers.push(update)

    // Check if answer is the right answer or a timeout, and update the score 
    let playerr = update.player === 'a' ? game.players[0].user.name : game.players[1].user.name 
    if(update.answer === 'timeout'){
      game.scores[update.player] -= 3
      game.scores.message = `No answer is given. 3 points are subtracted from both players`
    } else if(update.answer === game.questions[game.currentQuestion].correct_answer){
      game.scores[update.player] += 5 
      game.scores.message = `${playerr} gave the right answer and earned 5 points`
    } else {
      game.scores[update.player] -= 5
      game.scores.message = `${playerr} gave the wrong answer, 5 points are subtracted`
    } 

    // check if the game is finished
    if(game.currentQuestion > 8){ 
      game.status = 'finished' 
      game.winner = game.scores.a > game.scores.b ? 'a' : 'b'
    } else { game.currentQuestion += 1 }

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


