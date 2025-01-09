async function searchNeo4jData() {
    const rs = await search(`MATCH (n {name: $nodeName})-[r*]->(connected) RETURN n, r, connected AS m`);
    
    if (rs.results.length && rs.results[0].data.length) {
        return rs;
    }

    return search(`MATCH (n)-[r]->(m) WHERE toLower(n.name) =~ toLower($nodeName) RETURN n, r, m`);
}

async function search(query) {
    let nodeName = document.getElementById('search').value;
    console.log(`search: ${nodeName}`);

    if (!nodeName) {
        return [];
    }
    const result = await session.run( query, { nodeName } );

    const nodes = result.records.map(record => [record.get('n'), record.get('m')]).flat();
    const relationships = result.records.map(record => record.get('r'))
        .flat()
        .filter((x, index, self) => {
            const value = x.start.toString() + x.end.toString() + x.properties.name.toString();
            return index === self.findIndex((r) => r.start.toString() + r.end.toString() + r.properties.name.toString() === value);
        });

    const results = [
        {
            data: relationships.map(r => {
                const n = nodes.find(x => x.identity.toString() == r.start.toString());
                const m = nodes.find(x => x.identity.toString() == r.end.toString());

                return {
                    graph: {
                        nodes: [
                            { id: n.identity.toString(), labels: n.labels, properties: n.properties },
                            { id: m.identity.toString(), labels: m.labels, properties: m.properties }
                        ],
                        relationships: [
                            {
                                id: r.identity.toString(),
                                type: r.type,
                                startNode: r.start.toString(),
                                endNode: r.end.toString(),
                                properties: r.properties
                            }
                        ],
                    }
                };
            })
        }
    ];

    return { results };
}

async function fetchNeo4jData() {
    try {
        const result = await session.run(`MATCH (n)-[r]->(m) RETURN n, r, m`);
        nodesName = [];
        labels = [];

        const results = [
            {
                data: result.records.map(record => {
                    const n = record.get('n');
                    const r = record.get('r');
                    const m = record.get('m');

                    //add label to list
                    n.labels.map(label => {
                        if (!labels.includes(label)) {
                            labels.push(label);
                        }
                    });

                    //thêm danh sách node vào list hỗ trợ tìm kiếm
                    if (n.properties.name && !nodesName.includes(n.properties.name)) {
                        nodesName.push(n.properties.name);
                    }

                    return {
                        graph: {
                            nodes: [
                                { id: n.identity.toString(), labels: n.labels, properties: n.properties },
                                { id: m.identity.toString(), labels: m.labels, properties: m.properties }
                            ],
                            relationships: [
                                {
                                    id: r.identity.toString(),
                                    type: r.type,
                                    startNode: n.identity.toString(),
                                    endNode: m.identity.toString(),
                                    properties: r.properties
                                }
                            ]
                        }
                    };
                })
            }
        ];

        // Hiển thị các node ko có mối quan hệ
        const unrelatedNodes = await session.run('MATCH (node) WHERE NOT ()--(node) RETURN node');
        unrelatedNodes.records.map(record => {
            const n = record.get('node');

            n.labels.map(label => {
                if (!labels.includes(label)) {
                    labels.push(label);
                }
            });

            if (n.properties.name && !nodesName.includes(n.properties.name)) {
                nodesName.push(n.properties.name);
            }

            results[0].data.push({
                graph: {
                    nodes: [
                        { id: n.identity.toString(), labels: n.labels, properties: n.properties }
                    ],
                    relationships: []
                }
            })
        });

        return { results };
    } catch (error) {
        show(`Error fetching data from Neo4j: <br>${error.message}`);
        return { results: [] };
    }
}


async function readNode(label, propertyKey, propertyValue) {
    try {
        const query = `MATCH (n:${label} { ${propertyKey}: $value }) RETURN n`;
        const result = await session.run(query, { value: propertyValue });

        const nodes = result.records.map(record => record.get('n'));
        console.log(`Nodes found:`, nodes);
        return nodes;
    } catch (error) {
        show(`Error reading node! <br>${error.message}`, 'e');
    }
}

async function createNode(label, properties) {
    try {
        console.log(`createNode`);

        const query = `CREATE (n:${label} $properties) RETURN n`;
        const result = await session.run(query, { properties });

        const createdNode = result.records[0]?.get('n');
        console.log('Node created:', createdNode);
        show(`Node created successfully!`);

        return createdNode;
    } catch (error) {
        show(`Error creating node! <br>${error.message}`, 'e');
    }
}

async function updateNode(label, propertyKey, propertyValue, updatedProperties) {
    try {
        const query = `
            MATCH (n:${label} { ${propertyKey}: $value })
            SET n += $updatedProperties
            RETURN n
        `;
        const result = await session.run(query, {
            value: propertyValue,
            updatedProperties
        });

        const updatedNode = result.records[0]?.get('n');
        console.log('Node updated:', updatedNode);
        show(`Node updated!`);
        return updatedNode;
    } catch (error) {
        show(`Error updating node! <br>${error.message}`, 'e');
    }
}

async function deleteNode(label, propertyKey, propertyValue) {
    try {
        const query = `MATCH (n:${label})
        WHERE n.${propertyKey} = $value
        DETACH DELETE n`;
        console.log(query);

        await session.run(query, { value: propertyValue });

        show(`Node with ${propertyKey} = ${propertyValue} deleted.`);
    } catch (error) {
        show(`Error deleting node! <br>${error.message}`, 'e');
    }
}

async function createRelationship(startNodeId, endNodeId, relationshipType, properties = {}) {
    try {
        // Tạo mối quan hệ trong Neo4j
        const result = await session.run(
            `
            MATCH (a), (b)
            WHERE id(a) = $startId AND id(b) = $endId
            CREATE (a)-[r:${relationshipType} $properties]->(b)
            RETURN id(r) AS id
            `,
            {
                startId: parseInt(startNodeId),
                endId: parseInt(endNodeId),
                properties,
            }
        );

        show(`Relationship created successfully!`);
    } catch (error) {
        show(`Error creating relationship: <br>${error.message}`, 'e');
    }
}

async function deleteRelationship(startNodeId, endNodeId, relationshipType) {
    try {
        const result = await session.run(
            `
            MATCH (a)-[r:${relationshipType}]->(b)
            WHERE id(a) = $startId AND id(b) = $endId
            DELETE r
            RETURN COUNT(r) AS deletedCount
            `,
            {
                startId: parseInt(startNodeId),
                endId: parseInt(endNodeId),
            }
        );

        const deletedCount = result.records.length > 0 ? result.records[0].get('deletedCount') : 0;

        if (deletedCount > 0) {
            show(`Relationship deleted successfully!`);
        } else {
            show(`No relationship found to delete.`, 'e');
        }
    } catch (error) {
        show(`Error deleting relationship: <br>${error.message}`, 'e');
    }
}
