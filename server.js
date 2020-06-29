const app = require('./app')
const server = app.listen(process.env.PORT || 3000, '0.0.0.0')

/**
 * 서버 실행 중에 발생하는 에러를 핸들링 하는 함수
 * @param {*} error 
 */
const onError = (error) => {
    console.log(`# 에러 발생
    # 시간 : ${new Date()}
    # 내용 : ${error}`)
}

/**
 * 서버가 3000포트를 리스닝 하는 시점에 실행되는 함수
 */
const onListening = () => {
    console.log(`3000 port server listening!! ${new Date()}`)
}

server.on('error', onError)
server.on('listening', onListening)