const account = require("./account");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const _ = require("underscore");
const convert = require("xml-js");
const TIMEOUT = 4800;

module.exports = {
  validRegExp: /[가-힣ㄱ-ㅎㅏ-ㅣA-Z0-9\!\@\#\$\%\^\&\*\-\+\/\'\"\.\:]/g,
  line: "—————————————\n",

  /**
   * 명령어의 유형을 분석 후 반환
   * 유형1 [키워드]
   * 유형2 [키워드,키워드,키워드]
   * 유형3 [키워드+]
   * 유형4 [키워드+m]
   * 유형5 [키워드*]
   * 유형6 [키워드*m]
   * 유형7 유효하지 않은 문자열
   * 유형8 자비스 키워드 조회
   * 유형9 [@네이버아이디]
   * 유형10 [!네이버아이디,네이버아이디]
   * @param {string} command
   * @return {object}
   * {
   *      type: 'type01',
   *      data: [키워드] or [키워드,키워드,키워드]
   * }
   */
  preprocessCommand(command) {
    command = command.replace(/( |\n)/g, "").toUpperCase();

    if (command.slice(0, 1) === "@")
      return { type: "type09", data: [command.slice(1, command.length)] };
    if (command.slice(0, 1) === "!")
      return {
        type: "type10",
        data: [...command.slice(1, command.length).split(",")]
      };

    command = command.split(",").filter(e => e !== "");
    if (command.length > 1)
      return { type: "type02", data: command.slice(0, 8) };

    command = command[0] || "";
    if (command.replace(this.validRegExp, "").length !== 0 || command === "")
      return { type: "type07" };
    if (command.slice(-1) === "+")
      return { type: "type03", data: [command.slice(0, -1)] };
    if (command.slice(-2) === "+M")
      return { type: "type04", data: [command.slice(0, -2)] };
    if (command.slice(-1) === "*")
      return { type: "type05", data: [command.slice(0, -1)] };
    if (command.slice(-2) === "*M")
      return { type: "type06", data: [command.slice(0, -2)] };
    if (command === "자비스키워드조회") return { type: "type08" };

    return { type: "type01", data: [command] };
  },

  makeHeaderString(type) {
    let headerString = "";
    switch (type) {
      case "type01":
        headerString += this.line;
        headerString += "자비스 임무 수행 완료!\n";
        headerString += this.line;
        break;

      case "type02":
        headerString += this.line;
        headerString += "🤪자비스 두뇌 200% 풀가동!!🤪\n";
        headerString += this.line;
        break;

      case "type03":
      case "type04":
      case "type05":
      case "type06":
        headerString += this.line;
        headerString += "😎자비스 시크릿 모드 발동😎\n";
        headerString += this.line;
        break;

      case "type07":
        headerString += "자비스가 처리할 수 없는 명령입니다.";
        break;

      case "type08":
        headerString += "M-자비스 준비 완료-!\n\n";
        headerString += this.line;
        headerString += "😎M-자비스 사용방법 안내😎\n";
        headerString += this.line;
        headerString += "\n";
        headerString += "1.검색량 조회하기\n";
        headerString += "- 원하는 키워드 입력하기\n";
        headerString += "ex) 자비스\n\n";
        headerString += "2.한번에 여러 키워드 조회하기\n";
        headerString += "- 키워드 뒤에 쉼표 붙이기\n";
        headerString += "ex) 최신,마케팅,자비스\n\n";
        headerString += "3.연관검색어 함께 조회하기\n";
        headerString += "- 키워드 뒤에 + 붙이기\n";
        headerString += "ex) 자비스+\n\n";
        headerString += "4.PC 자동완성어 함께 조회\n";
        headerString += "- 키워드 뒤에 * 붙이기\n";
        headerString += "ex) 자비스*\n\n";
        headerString += "5.MO 자동완성어 함께 조회\n";
        headerString += "- 키워드 뒤에 *m 붙이기\n";
        headerString += "ex) 자비스*m\n\n";
        headerString += "6.방문자 수 조회\n";
        headerString += "- @ 뒤, 조회 할 아이디 하나만 입력\n";
        headerString += " ex) @jarvis\n";
        headerString += "- ! 뒤, 조회 할 아이디 여러개 입력\n";
        headerString += " ex) !jarvis,daese,nice\n\n";
        headerString += this.line;
        headerString += "★M-자비스 공지방\n";
        headerString += "http://bit.ly/2lWIRMP\n\n";
        headerString += "★M-자비스 마케팅 소통방\n";
        headerString += "http://bit.ly/2obB92d\n";
        headerString += this.line;
        break;

      case "type09":
        headerString += this.line;
        headerString += "😎M-자비스 방문자 X-ray😎\n";
        headerString += this.line;
        break;

      case "type10":
        headerString += this.line;
        headerString += "😎M-자비스 방문자 수 조회😎\n";
        headerString += this.line;
        break;

      case "typeTimeout":
        headerString += this.line;
        headerString += "😎자비스 에러 메시지😎\n";
        headerString += this.line;
        headerString += "*\n";
        headerString += "동시 요청량이 너무 많아서\n";
        headerString += "머리가 너무 아파요. (헤롱)\n";
        headerString += "*\n";
        headerString += "\n";
        headerString += "다시 검색해보세요!";
        break;
    }
    return headerString;
  },

  makeSubHeaderString(type, keyword) {
    switch (type) {
      case "type03":
        return `\n# [${keyword}]의 PC 연관 검색어입니다.\n${this.line}`;
      case "type04":
        return `\n# [${keyword}]의 MO 연관 검색어입니다.\n${this.line}`;
      case "type05":
        return `\n# [${keyword}]의 PC 자동 완성 검색어입니다.\n${this.line}`;
      case "type06":
        return `\n# [${keyword}]의 MO 자동 완성 검색어입니다.\n${this.line}`;
    }
  },

  makeBodyString(data) {
    let bodyString = `[${data.keyword}] 검색량입니다!`;
    bodyString += "\n\n";
    bodyString += `# 문서량 : ${data.blogDocuments}\n`;
    bodyString += `# PC 검색량 : ${data.pcSearchVolume}\n`;
    bodyString += `# MOBILE 검색량 : ${data.moSearchVolume}`;
    bodyString +=
      data.type === "normal"
        ? `\n# TOTAL 검색량: ${data.totalSearchVolume}\n`
        : "\n";
    return bodyString;
  },

  makeFooterString() {
    const now = new Date();

    now.setDate(now.getDate() - 1);
    let statisticPeriod1 = ``;
    statisticPeriod1 += `${now.getFullYear()}.`;
    statisticPeriod1 += `${now.getMonth() < 9 ? "0" : ""}${now.getMonth() +
      1}.`;
    statisticPeriod1 += `${now.getDate()}`;

    now.setDate(now.getDate() - 30);
    let statisticPeriod2 = ``;
    statisticPeriod2 += `${now.getFullYear()}.`;
    statisticPeriod2 += `${now.getMonth() < 9 ? "0" : ""}${now.getMonth() +
      1}.`;
    statisticPeriod2 += `${now.getDate()}`;

    return `${this.line}# 데이터 통계 기간\n${statisticPeriod2} ~ ${statisticPeriod1}`;
  },

  /**
   * 블로그 문서량 파싱
   * @param {string} keyword
   */
  async parseBlogDocuments(keyword) {
    const option = {
      method: "get",
      url: "https://openapi.naver.com/v1/search/blog.json",
      params: {
        query: keyword,
        display: 1
      },
      headers: {
        "X-Naver-Client-Id": account.naverClientId,
        "X-Naver-Client-Secret": account.naverClientSecret
      }
    };

    const res = await axios(option);
    return this.insertComma(res.data.total);
  },

  /**
   * PC 연관 키워드 파싱
   * @param {string} keyword
   */
  async parsePcAssociativeKeyword(keyword) {
    const option = {
      method: "get",
      url: "https://search.naver.com/search.naver",
      params: {
        query: keyword
      }
    };

    const associativeKeywords = [];
    const res = await axios(option);
    const $ = cheerio.load(res.data, { decodeEntities: false });

    $("ul._related_keyword_ul > li > a").each((index, elem) => {
      associativeKeywords.push(
        $(elem)
          .text()
          .replace(/ /g, "")
          .toUpperCase()
      );

      if (associativeKeywords.length >= 5) return false;
    });

    return this.buildDataStructure(associativeKeywords, "sub");
  },

  /**
   * MO 연관 키워드 파싱
   * @param {string} keyword
   */
  async parseMoAssociativeKeyword(keyword) {
    const option = {
      method: "get",
      url: "https://m.search.naver.com/search.naver",
      params: {
        query: keyword
      }
    };

    const associativeKeywords = [];
    const res = await axios(option);
    const $ = cheerio.load(res.data, { decodeEntities: false });

    $("div#_related_keywords a").each((index, elem) => {
      if ($(elem).attr("class")) return true;

      associativeKeywords.push(
        $(elem)
          .text()
          .replace(/ /g, "")
          .toUpperCase()
      );

      if (associativeKeywords.length >= 5) return false;
    });

    return this.buildDataStructure(associativeKeywords, "sub");
  },

  /**
   * PC 자동 완성 키워드 파싱
   * @param {string} keyword
   */
  async parsePcAutoCompleteKeyword(keyword) {
    const option = {
      method: "get",
      url: "http://ac.search.naver.com/nx/ac",
      params: {
        q: keyword,
        st: 100,
        r_format: "json"
      }
    };

    const res = await axios(option);
    const autoCompleteKeywords = _.flatten(res.data.items)
      .map(e => {
        return e.toUpperCase().replace(/ /g, "");
      })
      .filter(e => {
        return e !== keyword;
      })
      .slice(0, 5);
    return this.buildDataStructure(autoCompleteKeywords, "sub");
  },

  /**
   * MO 자동 완성 키워드 파싱
   * @param {string} keyword
   */
  async parseMoAutoCompleteKeyword(keyword) {
    const option = {
      method: "get",
      url: "https://mac.search.naver.com/mobile/ac",
      params: {
        q: keyword,
        st: 100,
        r_format: "json"
      }
    };

    const res = await axios(option);
    const autoCompleteKeywords = _.flatten(res.data.items)
      .map(e => {
        return e.toUpperCase().replace(/ /g, "");
      })
      .filter(e => {
        return e !== keyword;
      })
      .slice(0, 5);
    return this.buildDataStructure(autoCompleteKeywords, "sub");
  },

  /**
   * 키워드 검색량 추가하기
   * @param {string} keywords
   * @param {string} type
   */
  async addSearchVolume(keywords, type) {
    let volumeAddedData = [];

    while (keywords.length > 0) {
      const some = [];
      while (some.length < 5 && keywords.length > 0) {
        some.push(keywords.shift());
      }

      volumeAddedData = volumeAddedData.concat(
        await this.getKeywordVolume(some, type)
      );
      //await this.wait(100)
    }

    return volumeAddedData;
  },

  async getKeywordVolume(keywords, type) {
    const secretKey =
      type === "type01" ? account.secretKey : account.secretKey2;
    const customerId =
      type === "type01" ? account.customerId : account.customerId2;
    const accessLicense =
      type === "type01" ? account.accessLicense : account.accessLicense2;

    const path = "/keywordstool";
    const timestamp = new Date().getTime();
    const msg = `${timestamp}.GET.${path}`;
    const signature = crypto
      .createHmac("SHA256", secretKey)
      .update(msg)
      .digest("base64");
    const formatted = keywords.map(e => e.keyword).join(",");
    const option = {
      method: "get",
      url: `https://api.naver.com${path}`,
      params: {
        format: "json",
        hintKeywords: formatted
      },
      headers: {
        "X-Timestamp": timestamp,
        "X-Customer": customerId,
        "X-API-KEY": accessLicense,
        "X-Signature": signature
      }
    };

    const res = await axios(option);
    const data = res.data.keywordList;

    keywords = keywords.map(e1 => {
      const keyword = data.find(e2 => e1.keyword === e2.relKeyword);

      e1.pcSearchVolume =
        typeof keyword.monthlyPcQcCnt === "string"
          ? 10
          : keyword.monthlyPcQcCnt;
      e1.moSearchVolume =
        typeof keyword.monthlyMobileQcCnt === "string"
          ? 10
          : keyword.monthlyMobileQcCnt;
      e1.totalSearchVolume = e1.pcSearchVolume + e1.moSearchVolume;

      e1.pcSearchVolume = this.insertComma(e1.pcSearchVolume);
      e1.moSearchVolume = this.insertComma(e1.moSearchVolume);
      e1.totalSearchVolume = this.insertComma(e1.totalSearchVolume);

      return e1;
    });

    return keywords;
  },

  async parseBlogVisitCount(idList) {
    const blogVisitCounts = [];
    let res = null;

    for (let id of idList) {
      const option = {
        url: "https://blog.naver.com/NVisitorgp4Ajax.nhn",
        params: {
          blogId: id.toLowerCase()
        }
      };

      try {
        res = await axios(option);
        let xmlToJson = JSON.parse(
          convert.xml2json(res.data, { compact: true, spaces: 4 })
        );
        xmlToJson = xmlToJson.visitorcnts.visitorcnt.map(e => {
          return {
            date: `${e._attributes.id.slice(0, 4)}-${e._attributes.id.slice(
              4,
              6
            )}-${e._attributes.id.slice(6, 8)}`,
            cnt: Number(e._attributes.cnt)
          };
        });

        blogVisitCounts.push({
          id,
          lastFourDays: xmlToJson.slice(0, 4).map(e => {
            return { date: e.date, count: this.insertComma(e.cnt) };
          }),
          average: this.insertComma(
            Math.round(
              xmlToJson.slice(0, 4).reduce((prev, next) => {
                return prev + next.cnt;
              }, 0) / 4
            )
          ),
          today: xmlToJson[4].cnt
        });
      } catch (e) {
        blogVisitCounts.push({
          id,
          lastFourDays: [
            {
              date: "",
              count: ""
            }
          ],
          average: 0,
          today: 0
        });
      }
    }
    return blogVisitCounts;
  },

  insertComma(number) {
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  wait(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  },

  buildDataStructure(keywords, type) {
    return keywords.map(keyword => {
      return {
        keyword,
        type,
        blogDocuments: "",
        moSearchVolume: "",
        pcSearchVolume: "",
        totalSearchVolume: ""
      };
    });
  },

  getSubkeywordsFunctionByType(type) {
    switch (type) {
      case "type03":
        return this.parsePcAssociativeKeyword.bind(this);
      case "type04":
        return this.parseMoAssociativeKeyword.bind(this);
      case "type05":
        return this.parsePcAutoCompleteKeyword.bind(this);
      case "type06":
        return this.parseMoAutoCompleteKeyword.bind(this);
    }
  },

  deepCopy(array) {
    const copiedArray = [];
    array.forEach(e => copiedArray.push(Object.assign({}, e)));
    return copiedArray;
  },

  //성인 키워드 예외 처리 필요

  scrape(command) {
    return new Promise(async (resolve, reject) => {
      const processed = this.preprocessCommand(command);

      try {
        setTimeout(() => {
          return resolve(this.makeHeaderString("typeTimeout"));
        }, TIMEOUT);

        if (processed.type === "type07") throw "Invalid Command";
        if (processed.type === "type08") throw "Information";
        if (processed.type === "type09" || processed.type === "type10") {
          const data = await this.parseBlogVisitCount(
            processed.data.slice(0, 10).map(e => e.toLowerCase())
          );
          return resolve(
            this.makeResponseMessageForVisitCount(data, processed.type)
          );
        }

        processed.data = this.buildDataStructure(processed.data, "normal");

        if (processed.type !== "type01" && processed.type !== "type02") {
          const getSubKeywords = this.getSubkeywordsFunctionByType(
            processed.type
          );
          processed.data = [
            ...processed.data,
            ...(await getSubKeywords(processed.data[0].keyword))
          ];
        }

        for (let i in processed.data) {
          processed.data[i].blogDocuments = await this.parseBlogDocuments(
            processed.data[i].keyword
          );
        }

        processed.data = await this.addSearchVolume(
          this.deepCopy(processed.data),
          processed.type
        );
        return resolve(this.makeResponseMessage(processed));
      } catch (e) {
        if (
          e === "Invalid Command" ||
          (e.response && e.response.data.title === "Invalid Parameter")
        ) {
          return resolve(this.makeHeaderString("type07"));
        } else if (e === "Information") {
          return resolve(this.makeHeaderString("type08"));
        } else {
          return resolve("자비스 네트워크에 문제가 발생했습니다.");
        }
      }
    });
  },

  makeResponseMessage(processed) {
    let message = this.makeHeaderString(processed.type);

    const normalData = processed.data.filter(e => e.type === "normal");
    message += normalData.slice(1).reduce((prev, curr) => {
      let merged = prev;
      merged += this.line;
      merged += this.makeBodyString(curr);
      return merged;
    }, this.makeBodyString(normalData[0]));

    const subData = processed.data.filter(e => e.type === "sub");

    if (subData.length > 0) {
      message += this.makeSubHeaderString(
        processed.type,
        processed.data.find(e => e.type === "normal").keyword
      );
      message += subData.slice(1).reduce((prev, curr) => {
        let merged = prev;
        merged += this.line;
        merged += this.makeBodyString(curr);
        return merged;
      }, this.makeBodyString(subData[0]));
    }

    message += this.makeFooterString();

    return message;
  },

  makeResponseMessageForVisitCount(data, type) {
    let message = this.makeHeaderString(type);
    message += "*\n";

    if (type === "type09") {
      message += `아이디 ${data[0].id}의\n`;
      message += "최근 4일간 방문자 수 조회 결과\n";
      message += this.line;
      message += "\n";
      message += data[0].lastFourDays
        .map(e => `${e.date} : ${e.count}명\n`)
        .join("");
      message += "\n";
      message += "*\n";
      message += "4일 평균 방문자 수는\n";
      message += `${data[0].average}명 입니다.\n`;
      message += "\n";
      message += this.line;
      message += "*\n";
      message += "현 시간까지의\n";
      message += `방문자 수는 ${data[0].today}명 입니다.\n`;
      message += this.line;
    } else {
      message += "검색하신 아이디의\n";
      message += "4일 평균 방문자 수입니다.\n";
      message += this.line;
      message += "\n";
      message += data.map(e => `- ${e.id} : ${e.average}명 \n`).join("");
      message += "\n";
      message += "# 데이터 통계 기간\n";
      message += `${data[0].lastFourDays[0].date} ~ ${data[0].lastFourDays[3].date}\n`;
      message += this.line;
    }

    return message;
  }
};
