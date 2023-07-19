//すみさんの考えた形式

const render = (param, res) => {
    const document = e('html', {'lang': 'ja'}, [
        e('head', []),
        e('body', [
            e('div', {'class': 'main'}, [
                'test',
                param.error && e('span', {'class': 'error'}, [param.error])

            ])
        ])
    ])
    res.write(renderDocument(document))
}