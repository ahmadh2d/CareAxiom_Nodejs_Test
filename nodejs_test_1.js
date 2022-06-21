/*
 * Task 1: Implement the above task using plain node.js callbacks
 */

// import required libraries
import { createServer } from "http";
import { get } from "https";
import { parse } from "url";
import { readFile } from "fs";

// constants
const urlPathname = "/I/want/title";
const notFoundFilePath = "./html/page-not-found.html";
const titlesFilePath = "./html/display-website-titles.html";
const serverPort = 8080;
const urlRegex = /^(https?\:\/\/)?(www\.)?([\w|\d|\-]*\.)(\w+)([\\\/][\w\d\-]*)*(\?[\w\d\=\&\-\_\+\%]*)*$/g;

// Creating Server and starting task
createServer((req_server, res_server) => {
    const url_address = parse(req_server.url, true);
    if (url_address.pathname === urlPathname) {
        const query = url_address.query;

        const writeInHTMLEmit = (titlesLength, urlsLength) => {
            if (titlesLength === urlsLength)
                processingFinished();
        }

        // reading HTML file
        let htmlFileString = "";
        readFile(titlesFilePath, (err, data) => {
            if (err) {
                console.error(err);
                return;
            }

            htmlFileString = data.toString();
        }); 

        res_server.writeHead(200, { "Content-Type": "text/html" });
        
        if (!query?.address) {
            res_server.writeHead(500, { "Content-Type": "text/html" });
            htmlFileString = htmlFileString.replace(
                "{{}}",
                "Failed! address in query string not found"
                );
                res_server.write(htmlFileString);
                return res_server.end();
        }
        
        let pageTitles = [];
        const urlAddresses = typeof query.address === "string" ? [query.address] : query.address;

        for (let address of urlAddresses) {
            address = address.replace(urlRegex, 'https://www.$3$4$5$6');
            const urlParsed = parse(address, true);

            try {
                get(urlParsed, (response) => {
                    const { statusCode } = response;
                    const contentType = response.headers["content-type"];

                    let error;

                    if (statusCode !== 200) {
                        error = new Error(
                            address + ": Request Failed. " + `Status Code: ${statusCode}`
                        );
                    }

                    if (error) {
                        console.error(error.message);
                        pageTitles.push(`${address} - NO RESPONSE`);
                        // Consume response data to free up memory
                        response.resume();
                        writeInHTMLEmit(pageTitles.length, urlAddresses.length);

                        return;
                    }

                    response.setEncoding("utf8");
                    let rawData = "";
                    response.on("data", (chunk) => {
                        rawData += chunk;
                    });
                    response.on("end", () => {
                        try {
                            const startTitleIndex = rawData?.search(/<title>/gi);
                            const endTitleIndex = rawData?.search(/<\/title>/gi);

                            const pageTitle = rawData?.substring(
                                startTitleIndex + 7,
                                endTitleIndex
                            );

                            pageTitles.push(`${address} title is: ${pageTitle}`);

                            writeInHTMLEmit(pageTitles.length, urlAddresses.length);
                        } catch (e) {
                            console.error(e.message);
                            pageTitles.push(`${address} - NO RESPONSE`);
                            writeInHTMLEmit(pageTitles.length, urlAddresses.length);
                        }
                    });
                }).on("error", (e) => {
                    console.error(`Got error: ${e.message}`);
                    pageTitles.push(`${address} - NO RESPONSE`);
                    writeInHTMLEmit(pageTitles.length, urlAddresses.length);
                });
            } catch (error) {
                console.error(error.message);
                pageTitles.push(`${address} - NO RESPONSE`);
                writeInHTMLEmit(pageTitles.length, urlAddresses.length);
            }
        }

        const processingFinished = () => {
            let stringReplaced = "";
            for (let pageTitle of pageTitles) {
                stringReplaced += "<li>" + pageTitle + "</li>";
            }

            htmlFileString = htmlFileString.replace("{{}}", stringReplaced);
            res_server.write(htmlFileString);
            return res_server.end();
        };
    }
    else {
        res_server.writeHead(404, { "Content-Type": "text/html" });
        readFile(notFoundFilePath, (err, data) => {
            if (err) throw err;

            res_server.write(data);
            return res_server.end();
        });
    }
}).listen(serverPort);
