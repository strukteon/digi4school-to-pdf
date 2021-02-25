(() => {
    let pages;

    let d4s2pdf_modal = '<div class="modal-content">' +
            '<div class="header">' +
                '<img src="https://cdn.digi4school.at/img/d4s_logo.png">' +
                '<span>&nbsp;to PDF</span>' +
            '</div>' +
            '<div class="content row">' +
            '<div class="input-field col s12">' +
                '<select id="savemethod">' +
                    '<option value="png" selected>Als PNG (Rasterisiert)</option>' +
                    '<option value="vector">Vektorgrafik (Hochauflösend)</option>' +
                '</select>' +
                '<label>Speichermethode</label>' +
            '</div>' +
            '<div class="col s1"></div>' +
            '<div id="png-info" class="col s11">' +
                '<p class="range-field">' +
                    '<label>Skalierung: <span id="scale-display">0.75</span>x</label>' +
                    '<input type="range" id="scale" min="1" max="16" value="3"/>' +
                '</p>' +
                '<p>Achtung: Je höher die Auflösung ist, desto länger braucht der Vorgang und die Ergebnis-PDF verbraucht mehr Speicherplatz.</p>' +
            '</div>' +
            '<p class="col s11" id="vector-info" style="display: none">Achtung: Manche Bilder können nicht gespeichert werden.</p>' +
            '<div class="row">' +
                '<div class="input-field col s6">' +
                    '<input id="from-page" type="text">' +
                    '<label for="from-page">Ab Seite</label>' +
                '</div>' +
                '<div class="input-field col s6">' +
                    '<input id="to-page" type="text">' +
                    '<label for="to-page">Bis Seite</label>' +
                '</div>' +
            '</div>' +
            '<span style="display: none" id="page-error" class="d4s2pdf-error">Ungültiger Seitenbereich</span>' +
        '</div>' +
        '</div>' +
            '<div class="modal-footer">' +
            '<button id="button-close" class="modal-close waves-effect waves-green btn">Abbrechen</button>&nbsp;&nbsp;' +
            '<button id="button-convert" class="waves-effect waves-green btn btn-d4s2pdf">Konvertieren</button>' +
        '</div>';

    let div_modal = document.createElement("div");
    div_modal.id = "modal";
    div_modal.classList.add("modal");

    div_modal.innerHTML = d4s2pdf_modal;

    document.body.prepend(div_modal);



    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('#savemethod'))[0];

    instance_modal = M.Modal.getInstance(div_modal);
    instance_modal.open();

    let vector_info = document.getElementById("vector-info");
    let png_info = document.getElementById("png-info");

    // interface listeners
    let savemethod = document.getElementById("savemethod");
    savemethod.onchange = () => {
        if (savemethod.value === "png") {
            png_info.style.display = null;
            vector_info.style.display = "none";
        } else {
            vector_info.style.display = null;
            png_info.style.display = "none";
        }
    }

    let scale_display = document.getElementById("scale-display");
    let scale = document.getElementById("scale");

    scale.oninput = () => {
        scale_display.innerText = Number(scale.value) * 0.25;
    }

    let btn_convert = document.getElementById("button-convert");


    let from_page = document.getElementById("from-page");
    let to_page = document.getElementById("to-page");
    let page_error = document.getElementById("page-error")
    pages = document.getElementById("goBtn").childElementCount;

    from_page.max = pages;
    to_page.max = pages;

    let check_page_error = () => {
        if (from_page.value.match(/^[\d]*$/) === null || to_page.value.match(/^[\d]*$/) === null ||
            Number(to_page.value) >= 1 &&
            Number(from_page.value) > Number(to_page.value) ||
            Number(from_page.value) > pages ||
            Number(to_page.value) > pages) {
            page_error.style.display = null;
            btn_convert.classList.add("disabled");
        }
        else {
            page_error.style.display = "none";
            btn_convert.classList.remove("disabled");
        }
    }

    from_page.oninput = check_page_error;
    to_page.oninput = check_page_error;

    let remove_custom_css = () => {
        document.body.removeChild(div_modal);
        browser.runtime.sendMessage({type: "remove_custom_css"});
    }

    btn_convert.onclick = () => {
        let options = {
            title: document.title,
            savemethod: savemethod.value,
            scale: savemethod.value === "png" ? scale.value * 0.25 : 1,
            from_page: from_page.value.length > 0 ? Number(from_page.value) : 1,
            to_page: to_page.value.length > 0 ? Number(to_page.value) : pages,
        }

        console.log(options)

        generate_pdf(options)

        instance_modal.close();
        remove_custom_css();
    }

    document.getElementById("button-close").onclick = remove_custom_css;

    async function generate_pdf(options) {
        let http = new XMLHttpRequest();
        let url = new URL(window.location);
        let base_url = url.origin + url.pathname;

        let svg_container = document.evaluate("//*[@id=\"jpedal\"]/div[2]/object", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        let width = Number(svg_container.width);
        let height = Number(svg_container.height);
        console.log("before pdfdoc")

        let pdf_doc = new PDFDocument({
            autoFirstPage: false,
            size: [
                width * options.scale,
                height * options.scale
            ]
        });

        let chunks = [];
        pdf_doc.pipe({
            // writable stream implementation
            write: (chunk) => chunks.push(chunk),
            end: () => {
                let pdfBlob = new Blob(chunks, {
                    type: 'application/octet-stream'
                });
                let blobUrl = URL.createObjectURL(pdfBlob);
                let a = document.createElement("a");
                a.href = blobUrl;
                a.download = `${options.title}.pdf`;
                a.click();
                URL.revokeObjectURL(blobUrl)
            },
            // readable streaaam stub iplementation
            on: (event, action) => {
            },
            once: (...args) => {
            },
            emit: (...args) => {
            },
        });

        console.log("after pdfdoc")

        let convert_progress = {
            title: document.title,
            from_page: options.from_page,
            cur_page: options.from_page - 1,
            to_page: options.to_page,
            page_count: pages,
            time_begin: new Date(),
        }
        // send message to background script
        browser.runtime.sendMessage({
            type: "start_converting",
            convert_progress,
        });

        // cancel the convertion progress
        let canceled = false;
        browser.runtime.onMessage.addListener(msg => {
            if (msg.type === "cancel_convert")
                canceled = true;
        });

        window.onbeforeunload = () => {
            browser.runtime.sendMessage({
                type: "stop_converting"
            });
            pdf_doc.end();
        }

        for (let i = options.from_page; i <= options.to_page; i++) {
            if (canceled) break;
            await download_svg(i);
            console.log("downloaded page " + i);
            convert_progress.cur_page = i;
            browser.runtime.sendMessage({
                type: "update_progress",
                convert_progress,
            });
        }
        pdf_doc.end();
        browser.runtime.sendMessage({
            type: "stop_converting"
        });

        window.onbeforeunload = undefined;
        console.log("done")

        function download_svg(page) {
            return new Promise((resolve, reject) => {

                http.open("GET", `${base_url}${page}/${page}.svg`);
                console.log(`${base_url}${page}/${page}.svg`)
                http.onreadystatechange = () => {
                    // cancel callback if request hasnt finished
                    if (http.readyState !== XMLHttpRequest.DONE)
                        return;
                    console.log("in http")
                    let parser = new DOMParser();

                    let updated_response = http.responseText;

                    let xml_doc = parser.parseFromString(updated_response, "text/xml");
                    let uri_image_promises = [];
                    console.log("before xmldoc")
                    for (let c of xml_doc.children[0].children) {
                        if (c.localName === "image") {
                            let href = c.attributes["xlink:href"].textContent;
                            console.log("href")
                            uri_image_promises.push(to_data_uri(`${base_url}${page}/${href}`));
                        }
                    }

                    console.log("before promises")
                    Promise.all(uri_image_promises)
                        .then(uris => {
                            console.log(uris)
                            for (let {uri, url} of uris)
                                updated_response = updated_response
                                    // substring in order to get the original path from the svg
                                    .replace(url.substring(`${base_url}${page}/`.length), uri);

                            let xml_doc = parser.parseFromString(updated_response, "text/xml");
                            let svg_html = xml_doc.rootElement.outerHTML;
                            console.log("before add page")

                            pdf_doc.addPage();

                            let add_page;
                            if (options.savemethod === "vector") add_page = add_as_vector;
                            else if (options.savemethod === "png") add_page = add_as_png;

                            add_page(pdf_doc, svg_html)
                                .then(() => resolve(page));
                        });

                }

                http.send();

            });

            function add_as_vector(doc, svg) {
                return new Promise((resolve, reject) => {
                    SVGtoPDF(doc, svg, 0, 0);
                    resolve();
                });
            }

            function add_as_png(doc, svg) {
                return new Promise((resolve, reject) => {
                    console.log(svgAsPngUri)
                    let template = document.createElement("div");
                    template.innerHTML = svg;
                    let svg_elem = template.childNodes[0];
                    svg_elem.style.background_color = "white";
                    console.log(svg_elem)
                    svgAsPngUri(svg_elem, {scale: options.scale}, (uri, w, h) => {
                        doc.image(uri, 0, 0);

                        resolve();
                    });
                });
            }
        }

        // used to parse images in svgs to pure data uris
        function to_data_uri(url) {
            return new Promise((resolve, reject) => {
                let http = new XMLHttpRequest();
                http.onload = function () {
                    let reader = new FileReader();
                    reader.onloadend = function () {
                        resolve({
                            uri: reader.result,
                            url
                        });
                    }
                    reader.readAsDataURL(http.response);
                };
                http.open('GET', url);
                http.responseType = 'blob';
                http.send();
            });
        }
    }

})();

undefined;