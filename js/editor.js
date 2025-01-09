function showObjectEditor(obj = {}) {
    const container = document.getElementById('popup-container');
    const hiddenKeys = ['id', 'source', 'target'];

    const generateFormFields = (object) =>
        Object.entries(object)
            .filter(([key]) => !hiddenKeys.includes(key))
            .map(([key, value]) => `
                <div class="mb-3" data-key="${key}">
                    <label for="input-${key}" class="form-label">${key}</label>
                    <input type="text" class="form-control" id="input-${key}" value="${value}">
                </div>
            `).join('');

    const modalHTML = `
    <div id="objectEditorModal">
        <div class="modal-body">
            <form id="objectEditorForm">
                ${generateFormFields(obj)}
            </form>
            ${profile?.role == 'admin' ? `<button type="button" class="btn btn-success" id="addPropertyBtn">(+)</button>
            <button type="button" class="btn btn-primary" id="createBtn">Create</button>
            <button type="button" class="btn btn-warning" id="updateBtn">Update</button>
            <button type="button" class="btn btn-danger" id="deleteBtn">Delete</button>`: ''}
            
        </div>
    </div>`;

    container.innerHTML = modalHTML;

    if (profile?.role == 'admin') {
        document.getElementById('addPropertyBtn').onclick = () => {
            const form = document.getElementById('objectEditorForm');
            const newKey = prompt("Enter the key for the new property:");

            if (newKey) {
                const newFieldHTML = `
                <div class="mb-3" data-key="${newKey}">
                    <label for="input-${newKey}" class="form-label">${newKey}</label>
                    <input type="text" class="form-control" id="input-${newKey}" value="">
                </div>`;
                form.insertAdjacentHTML('beforeend', newFieldHTML);

                const newInput = document.getElementById(`input-${newKey}`);
                newInput.focus();
            }
        };

        document.getElementById('createBtn').onclick = async () => {
            const newData = getFormData();
            var rs = await createNode(newData.labels, newData);
            neo4jd3.updateNodesAndRelationships([{ id: rs.identity.toString(), labels: rs.labels, properties: rs.properties }], []);
        };

        document.getElementById('updateBtn').onclick = async () => {
            const updatedObj = getFormData();
            await updateNode(updatedObj.labels, 'name', obj.name, updatedObj);
            neo4jd3.resetWithNeo4jData(await fetchNeo4jData());
        };

        document.getElementById('deleteBtn').onclick = async () => {
            const updatedObj = getFormData();
            if (confirm('Are you sure you want to delete this node?')) {
                await deleteNode(updatedObj.labels, 'name', obj.name);
                neo4jd3.resetWithNeo4jData(await fetchNeo4jData());
            }
        };
    }


    // Function to extract form data
    const getFormData = () => {
        const form = document.getElementById('objectEditorForm');
        const data = {};
        form.querySelectorAll('[data-key]').forEach(field => {
            const key = field.getAttribute('data-key');
            const value = field.querySelector('input').value;
            data[key] = value;
        });
        return data;
    };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////showRelationsEditor//////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function showRelationsEditor(obj = {}) {
    const container = document.getElementById('popup-relations');
    const hiddenKeys = ['id', 'source', 'target'];

    const generateFormFields = (object) =>
        Object.entries(object)
            .filter(([key]) => !hiddenKeys.includes(key))
            .map(([key, value]) => `
                <div class="mb-3" data-key="${key}">
                    <label for="input-${key}" class="form-label">${key}</label>
                    <input type="text" class="form-control" id="input-${key}" value="${value}">
                </div>
            `).join('');

    const modalHTML = `
    <div id="relationsEditorModal">
        <div class="modal-body">
            <form id="relationsEditorForm">
                ${generateFormFields(obj)}
            </form>
            ${profile?.role == 'admin' ? `<button type="button" class="btn btn-primary" id="createRelations">Create</button>
            <button type="button" class="btn btn-danger" id="deleteRelations">Delete</button>`: ''}
        </div>
    </div>`;

    container.innerHTML = modalHTML;
    if (profile?.role == 'admin') {
        document.getElementById('createRelations').onclick = async () => {
            const formData = getFormData();
            if (formData.relationship) {
                await createRelationship(obj.source.id, obj.target.id, formData.relationship, { name: formData.relationship, createTime: Date.now() });
                neo4jd3.resetWithNeo4jData(await fetchNeo4jData());
            } else {
                show('Relationship must not be empty', 'e');
            }
        };

        document.getElementById('deleteRelations').onclick = async () => {
            const formData = getFormData();
            await deleteRelationship(obj.source.id, obj.target.id, formData.relationship)

            neo4jd3.resetWithNeo4jData(await fetchNeo4jData());
        };

    }

    // Function to extract form data
    const getFormData = () => {
        const form = document.getElementById('relationsEditorForm');
        const data = {};
        form.querySelectorAll('[data-key]').forEach(field => {
            const key = field.getAttribute('data-key');
            const value = field.querySelector('input').value;
            data[key] = value;
        });
        return data;
    };
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////SEARCH and autoComplete//////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function searchOn(words, find, limit) {
    if (words == undefined || !Array.isArray(words)) {
        return [];
    }

    if (find == undefined || String(find).length <= 0) {
        return [];
    }

    if (limit == undefined || isNaN(limit)) {
        limit = null;
    }

    let matches = [];
    words.forEach((word) => {
        if (limit == 0) {
            return matches;
        }

        if (word.toLowerCase() != find.toLowerCase()) {

            if (word.toLowerCase().substr(0, find.length) == find.toLowerCase()) {
                matches.push(word);

                if (limit !== null) {
                    limit--;
                }
            }
        }
    });

    return matches;
}

let textboxes = document.querySelectorAll('.completeIt');
textboxes.forEach((textbox) => {
    let input = textbox.querySelector('input[type="text"]');
    let autoComplete = textbox.querySelector('.autoComplete');

    input.addEventListener('input', () => {
        let val = input.value;
        let matches = searchOn(nodesName, val, 15);
        let items = autoComplete.querySelectorAll('.item');
        let remains = [];

        items.forEach((item) => {
            let save = false;
            matches.forEach((match) => {
                if (item.dataset.value == match) {
                    save = true;
                    remains.push(match);
                }
            });

            if (!save) {
                item.remove();
            }
        });

        matches.forEach((match, index) => {
            if (!remains.includes(match)) {
                let item = document.createElement('a');
                item.classList.add('item');
                item.setAttribute('href', '#');

                item.innerHTML = match;
                item.dataset.value = match;

                item.addEventListener('click', (event) => {
                    event.preventDefault();

                    input.value = match;

                    autoComplete.querySelectorAll('.item').forEach((item) => {
                        item.remove();
                    });

                    input.focus();
                });

                setTimeout(() => {
                    autoComplete.appendChild(item);
                }, index * 50);
            }
        });
    });

    input.addEventListener('keyup', (event) => {
        if (event.keyCode == 40) { // Down
            let items = autoComplete.querySelectorAll('.item');
            if (items.length > 0) {
                let selected = autoComplete.querySelector('.item.selected');
                if (selected) {
                    selected.classList.remove('selected');
                    let nextItem = selected.nextElementSibling || items[0]; // Quay lại phần tử đầu nếu hết danh sách
                    nextItem.classList.add('selected');
                } else {
                    // Nếu chưa có gì được chọn, chọn phần tử đầu tiên
                    items[0].classList.add('selected');
                }
            }
        } else if (event.keyCode == 38) { // Up
            let items = autoComplete.querySelectorAll('.item');
            if (items.length > 0) {
                let selected = autoComplete.querySelector('.item.selected');
                if (selected) {
                    selected.classList.remove('selected');
                    let prevItem = selected.previousElementSibling || items[items.length - 1]; // Quay lại phần tử cuối nếu hết danh sách
                    prevItem.classList.add('selected');
                } else {
                    // Nếu chưa có gì được chọn, chọn phần tử cuối cùng
                    items[items.length - 1].classList.add('selected');
                }
            }
        } else if (event.keyCode == 13) { // Enter
            let selected = autoComplete.querySelector('.item.selected');
            if (selected) {
                input.value = selected.dataset.value;
                autoComplete.innerHTML = '';
            }
            searchNeo4jData().then(rs => {
                neo4jd3.resetWithNeo4jData(rs);
                sliceText();
            });
        }
    });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////toast alert//////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function show(message, type = 'success') {
    let bgClass = 'text-bg-success';
    if (type === 's') bgClass = 'text-bg-success';
    if (type === 'w') bgClass = 'text-bg-warning';
    if (type === 'e') bgClass = 'text-bg-danger';

    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" style="margin-bottom: 5px">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('toast-container');
    container.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 1500 });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function sliceText() {
    const maxCharsPerLine = 12;
    const maxLines = 3;

    document.querySelectorAll('.node .text').forEach(function (element) {
        const words = element.textContent.split(' ');
        let formattedText = '';
        let currentLine = '';
        let tspanCount = 0;
        let stopProcessing = false;

        words.forEach((word) => {
            if (stopProcessing) return;
            if ((currentLine + word).length > maxCharsPerLine) {
                tspanCount++;
                if (tspanCount === maxLines) {
                    //formattedText += `<tspan x="0" dy="1.2em">...</tspan>`;
                    formattedText += `<tspan x="0" dy="1.2em">${currentLine.trim()}...</tspan>`;
                    stopProcessing = true;
                } else {
                    formattedText += `<tspan x="0" dy="1.2em">${currentLine.trim()}</tspan>`;
                    currentLine = word + ' ';
                }
            } else {
                currentLine += word + ' ';
            }
        });

        if (!stopProcessing && currentLine.trim() && tspanCount < maxLines) {
            formattedText += `<tspan x="0" dy="1.2em">${currentLine.trim()}</tspan>`;
            tspanCount++;
        }

        element.innerHTML = formattedText.trim();
        const yValue = tspanCount * -1 + '%';
        element.setAttribute('y', yValue);
    });
}