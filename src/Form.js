/* eslint no-control-regex: "off" */
import React from 'react';
import $ from 'jquery';
import PropTypes from 'prop-types';
import InputRange from 'react-input-range';
import NumericInput from 'react-numeric-input';
import Textarea from 'react-textarea-autosize';
import { Modal, Button, OverlayTrigger, Popover,
        Tooltip, HelpBlock, FormGroup, FormControl,
        Radio, InputGroup, Nav, NavItem } from 'react-bootstrap';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { NotificationContainer, NotificationManager } from 'react-notifications';
import decamelize from 'decamelize';
import qs from 'qs';
import commaNumber from 'comma-number';
import 'react-input-range/lib/css/index.css';
import Filetype from './Filetype';
import StorageHistory from './storageHistory';
import Labelize from './i18n/fr';

// https://trello.com/c/XXtGrIQq/157-2-longueur-de-requ%C3%AAte-max-tester-limites-avec-chrome-et-firefox
export const characterLimit = 67860;
export const nbHistory = 30;

export default class Form extends React.Component {

    static handleReload() {
        if (JSON.parse(window.localStorage.getItem('dlISTEXlastUrl'))) {
            window.location = JSON.parse(window.localStorage.getItem('dlISTEXlastUrl'));
        }
    }

    static handleCopy() {
        NotificationManager.info('Le lien a été copié dans le presse-papier', '', 2000);
    }

    constructor(props) {
        super(props);
        this.defaultState = {
            q: '',
            querywithIDorARK: '',
            size: 5000,
            limitNbDoc: 10000,
            extractMetadata: false,
            extractFulltext: false,
            extractEnrichments: false,
            extractCovers: false,
            extractAnnexes: false,
            downloading: false,
            URL2Download: '',
            errorRequestSyntax: '',
            errorDuringDownload: '',
            rankBy: 'relevance',
            total: 0,
            activeKey: '1',
        };
        this.state = this.defaultState;
        this.child = [];
        this.timer = 0;

        this.handleQueryChange = this.handleQueryChange.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleFiletypeChange = this.handleFiletypeChange.bind(this);
        this.handleFormatChange = this.handleFormatChange.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handlerankByChange = this.handlerankByChange.bind(this);
        this.isDownloadDisabled = this.isDownloadDisabled.bind(this);
        this.interpretURL = this.interpretURL.bind(this);
        this.recoverFormatState = this.recoverFormatState.bind(this);
        this.hideModalShare = this.hideModalShare.bind(this);
        this.hideModalExemple = this.hideModalExemple.bind(this);
        this.calculateNbDocs = this.calculateNbDocs.bind(this);
    }

    componentWillMount() {
        const url = document.location.href;
        const shortUrl = url.slice(url.indexOf('?') + 1);
        this.interpretURL(shortUrl);
    }

    componentDidMount() {
        this.recoverFormatState();
    }

    characterNumberValidation() {
        const length = this.state.q.length;
        if (length < characterLimit - 1000) return 'success';
        else if (length <= characterLimit) return 'warning';
        else if (length > characterLimit) return 'error';
        return null;
    }

    recoverFormatState() {
        const self = this;
        this.child.forEach((type) => {
            type.child.forEach((format) => {
                if (format.state[format.props.format]) {
                    self.setState({
                        [format.state.name]: true,
                    });
                }
            });
        });
    }

    hideModalShare() {
        this.setState({
            showModalShare: false,
        });
    }

    hideModalExemple() {
        this.setState({
            showModalExemple: false,
        });
    }

    calculateNbDocs(sizeParam = this.state.limitNbDoc) {
        const self = this;
        const ISTEX = this.state.activeKey === '1'
            ? this.buildURLFromState(this.state.q, false)
            : this.buildURLFromState(this.transformIDorARK(), false);
        ISTEX.searchParams.delete('extract');
        ISTEX.searchParams.delete('withID');
        if (this.istexDlXhr) {
            this.istexDlXhr.abort();
        }
        this.istexDlXhr = $.get(ISTEX.href)
        .done((json) => {
            const { total } = json;
            let size;
            if (!total || total === 0) {
                size = 5000;
            } else if (sizeParam <= this.state.limitNbDoc) {
                if (sizeParam > total) {
                    size = total;
                } else {
                    size = sizeParam;
                }
            } else {
                size = this.state.limitNbDoc;
            }
            return this.setState({
                size,
                total: total || 0,
            });
        }).fail((err) => {
            if (err.status >= 500) {
                return self.setState({ errorServer: 'Error server TODO ...' });
            }
            if (err.status >= 400 && err.status < 500) {
                return this.setState({ errorRequestSyntax: err.responseJSON._error });
            }
            return null;
        },
        )
        .always(() => {
            this.istexDlXhr = null;
        });
    }

    transformIDorARK() {
        if (this.state.querywithIDorARK) {
            if (this.state.querywithIDorARK.includes('ark')) {
                const prefixLength = this.state.querywithIDorARK.split('/', 2).join('/').length;
                const prefix = this.state.querywithIDorARK.substring(0, prefixLength + 1);
                const res = prefix
                            .concat('("')
                            .concat(this.state.querywithIDorARK.replace(new RegExp(prefix, 'g'), ''))
                            .concat('")');
                return res.replace(new RegExp('\n', 'g'), '" "');
            }
            return 'id:('
                    .concat(this.state.querywithIDorARK.match(new RegExp(`.{1,${40}}`, 'g')))
                    .concat(')')
                    .replace(new RegExp(',', 'g'), ' ');
        }
        return '';
    }

    interpretURL(url) {
        const parsedUrl = qs.parse(url);
        if (Object.keys(parsedUrl).length >= 1) {
            this.setState({
                q: parsedUrl.withID ? '' : (parsedUrl.q || ''),
                querywithIDorARK: parsedUrl.withID ? parsedUrl.q : '',
                size: parsedUrl.size || 5000,
                limitNbDoc: 10000,
                extractMetadata: false,
                extractFulltext: false,
                extractEnrichments: false,
                extractCovers: (parsedUrl.extract && parsedUrl.extract.includes('covers')) || false,
                extractAnnexes: (parsedUrl.extract && parsedUrl.extract.includes('annexes')) || false,
                downloading: !!parsedUrl.download,
                URL2Download: '',
                errorRequestSyntax: '',
                errorDuringDownload: '',
                rankBy: parsedUrl.rankBy || 'relevance',
                activeKey: parsedUrl.withID ? '2' : '1',
                total: 0,
            }, () => this.calculateNbDocs(parsedUrl.size));

            if (parsedUrl.extract) {
                parsedUrl.extract.split(';').forEach((filetype) => {
                    const type = filetype.charAt(0).toUpperCase().concat(filetype.slice(1, filetype.indexOf('[')));
                    const formats = filetype.slice(filetype.indexOf('[') + 1, filetype.indexOf(']')).split(',');
                    let res = '';
                    formats.forEach((format) => {
                        res += `${format},`;
                    });
                    res = res.slice(0, res.length - 1);
                    this.setState({
                        [type]: res,
                    }, () => {
                        if (parsedUrl.download) {
                            this.handleSubmit(new Event('submit'));
                        }
                    });
                });
            }
        }
    }

    waitRequest() {
        if (this.state.q.length > 0 || this.state.querywithIDorARK.length > 0) {
            if (this.timer) {
                window.clearTimeout(this.timer);
            }
            this.timer = window.setTimeout(() => { this.calculateNbDocs(); }, 800);
        } else {
            this.setState({
                size: 5000,
                total: 0,
            });
        }
    }

    handleQueryChange(event) {
        if (event) {
            if (this.state.activeKey === '1') {
                this.setState({
                    errorRequestSyntax: '',
                    q: event.query || event.target.value,
                }, () => this.waitRequest());
            } else {
                this.setState({
                    errorRequestSyntax: '',
                    querywithIDorARK: event.query || event.target.value,
                }, () => this.waitRequest());
            }
        } else {
            this.setState({
                errorRequestSyntax: '',
            }, () => this.waitRequest());
        }
    }

    handleInputChange(event) {
        const target = event.target;
        const name = target.name;
        const value = target.type && target.type === 'checkbox' ? target.checked : target.value;
        this.setState({
            [name]: value,
        });
    }

    handleFiletypeChange(filetypeEvent) {
        const { filetype, value } = filetypeEvent;
        const name = 'extract'.concat(filetype.charAt(0).toUpperCase()).concat(filetype.slice(1));
        this.setState({
            [name]: value,
        });
    }

    handlerankByChange(rankByEvent) {
        const target = rankByEvent.target;
        const name = target.name;
        this.setState({
            rankBy: name,
        });
    }

    handleFormatChange(formatEvent) {
        const filetype = formatEvent.filetype;
        const format = formatEvent.format;
        const name = 'extract'
        .concat(filetype.charAt(0).toUpperCase()).concat(filetype.slice(1))
        .concat(format.charAt(0).toUpperCase()).concat(format.slice(1));
        this.setState({
            [name]: formatEvent.value,
        });
    }

    handleSubmit(event) {
        const href = this.buildURLFromState();
        if (this.state.activeKey === '2') {
            href.searchParams.set('q', this.transformIDorARK());
            href.searchParams.delete('withID');
        }
        this.setState({
            downloading: true,
            URL2Download: href,
        });
        window.setTimeout(() => {
            window.location = href;
        }, 1000);
        event.preventDefault();
    }

    handleSelectNav(eventKey) {
        this.setState({
            activeKey: eventKey,
        }, () => this.calculateNbDocs());
    }

    handleCancel(event) {
        if (window.localStorage) {
            const { href } = this.buildURLFromState();
            const url = href.slice(href.indexOf('?'));
            const formats = qs.parse(url).extract.split(';');
            const dlStorage = {
                url,
                date: new Date(),
                formats,
                size: this.state.size,
                q: this.state.activeKey === '1' ? this.state.q : this.state.querywithIDorARK,
                rankBy: this.state.rankBy,
            };
            if (JSON.parse(window.localStorage.getItem('dlISTEX'))) {
                const oldStorage = JSON.parse(window.localStorage.getItem('dlISTEX'));
                oldStorage.push(dlStorage);
                if (oldStorage.length > nbHistory) {
                    oldStorage.shift();
                }
                window.localStorage.setItem('dlISTEX', JSON.stringify(oldStorage));
            } else {
                window.localStorage.setItem('dlISTEX', JSON.stringify([dlStorage]));
            }
        }
        this.erase();
        event.preventDefault();
    }

    updateUrl(defaultState = false) {
        if (!defaultState) {
            const newUrl = this.buildURLFromState().href.slice(this.buildURLFromState().href.indexOf('?'));
            window.history.pushState('', '', newUrl);
        } else {
            const url = window.location.href.split('/');
            const domain = `${url[0]}//${url[2]}`;
            window.history.pushState('', '', domain);
        }
    }

    buildURLFromState(query = null, withHits = true) {
        const ISTEX = new URL('https://api.istex.fr/document/');
        const filetypeFormats = Object.keys(this.state)
        .filter(key => key.startsWith('extract'))
        .filter(key => this.state[key])
        .map(key => decamelize(key, '-'))
        .map(key => key.split('-').slice(1))
        .map(([filetype, format]) => ({ filetype, format }))
        .reduce((prev, { filetype, format }) => {
            if (!prev[filetype]) {
                prev[filetype] = [format];
            } else {
                prev[filetype].push(format);
            }
            return prev;
        }, {});
        const extract = Object.keys(filetypeFormats)
        .reduce((prev, filetype) => {
            const formats = filetypeFormats[filetype];
            return prev
            .concat(filetype)
            .concat(formats[0] || formats.length > 1 ? '[' : '')
            .concat(!formats[0] ? formats.slice(1) : formats)
            .concat(formats[0] || formats.length > 1 ? '];' : ';');
        }
        , '')
        .slice(0, -1);
        if (this.state.activeKey === '1') {
            ISTEX.searchParams.set('q', query || this.state.q);
        } else {
            ISTEX.searchParams.set('q', query || this.state.querywithIDorARK);
            ISTEX.searchParams.set('withID', true);
        }
        ISTEX.searchParams.set('extract', extract);
        if (withHits) {
            ISTEX.searchParams.set('size', this.state.size);
        }
        ISTEX.searchParams.set('rankBy', this.state.rankBy);
        ISTEX.searchParams.set('sid', 'istex-dl');
        return ISTEX;
    }

    erase() {
        this.child.forEach((c) => {
            if (!c.props.disabled) {
                const name = 'extract'
                .concat(c.props.filetype.charAt(0).toUpperCase())
                .concat(c.props.filetype.slice(1));
                c.uncheckCurrent(name);
            }
        });
        this.setState(this.defaultState);
    }

    tryExempleRequest(queryExample, withID = false) {
        if (withID) {
            this.setState({
                activeKey: '2',
                querywithIDorARK: queryExample,
                showModalExemple: false,
            });
        } else {
            this.setState({
                activeKey: '1',
                q: queryExample,
                showModalExemple: false,
            });
        }
        this.handleQueryChange(null, queryExample);
        document.body.click();
    }

    updateUrlAndLocalStorage() {
        if (window.localStorage) {
            let isDefaultState = true;
            Object.keys(this.defaultState).forEach((attribute) => {
                if (this.defaultState[attribute] !== this.state[attribute]) {
                    isDefaultState = false;
                }
            });
            if (!isDefaultState) {
                const { href } = this.buildURLFromState();
                const url = href.slice(href.indexOf('?'));
                this.updateUrl();
                window.localStorage.setItem('dlISTEXlastUrl', JSON.stringify(url));
            } else {
                this.updateUrl(true);
            }
        }
    }

    isDownloadDisabled() {
        const filetypeFormats = Object.keys(this.state)
        .filter(key => key.startsWith('extract'))
        .filter(key => this.state[key]);
        return (!this.state.total || this.state.total <= 0 || filetypeFormats.length <= 0);
    }
    render() {
        const closingButton = (
            <Button
                bsClass="buttonClose"
                onClick={() => { document.body.click(); }}
            >
                &#x2716;
            </Button>);

        const popoverRequestHelp = (
            <Popover
                id="popover-request-help"
                title={<span> Aide à la construction de requêtes {closingButton}</span>}
            >
            Pour vous aider à construire votre requête, des exemples pédagogiques vous sont
            proposés sur la droite (icône ampoule).
            Si vous avez besoin de conseils, <a href="mailto:contact@listes.istex.fr">contactez l’équipe ISTEX</a>
                <br />
            </Popover>
        );

        const popoverFiletypeHelp = (
            <Popover
                id="popover-filetype-help"
                title={<span> Insérer titre {closingButton}</span>}
            >
              Insérer texte
                <br />
            </Popover>
        );
        const popoverRequestClassic = (
            <Popover
                id="popover-request-classic"
                title={<span> Recherche classique {closingButton}</span>}
            >
                Pour élaborer votre équation de recherche de mode classique, vous pouvez
                vous aider du démonstrateur ISTEX, de la documentation ISTEX ou des exemples
                mis à disposition via le bouton &quot;Exemples&quot;.
            </Popover>
        );

        const examplesTooltip = (
            <Tooltip data-html="true" id="resetTooltip">
                Testez des exemples de requête
            </Tooltip>
        );

        const popoverRequestARK = (
            <Popover
                id="popover-request-ark"
                title={<span> Recherche par ARK {closingButton}</span>}
            >
                Copier/coller une liste d&apos;identifiants de type ARK dans cet onglet et le formulaire
                l&apos;interprétera automatiquement.
                Un exemple est disponible dans la liste du bouton &quot;Exemples&quot;.
            </Popover>
        );

        const shareTooltip = (
            <Tooltip data-html="true" id="resetTooltip">
                Partagez votre corpus par un lien
            </Tooltip>
        );

        const resetTooltip = (
            <Tooltip data-html="true" id="resetTooltip">
                Réinitialisez votre requête (les formulaires de cette page seront vidés)
            </Tooltip>
        );
        const historyTooltip = (
            <Tooltip data-html="true" id="previewTooltip">
                Accédez à l&apos;historique de vos téléchargements
            </Tooltip>
        );

        const tryRequestTooltip = (
            <Tooltip data-html="true" id="tryRequestTooltip">
                Essayez cette requête
            </Tooltip>
        );

        const reloadTooltip = (
            <Tooltip data-html="true" id="previewTooltip">
                Récupérez les derniers formulaires (avant téléchargement)
            </Tooltip>
        );

        const previewTooltip = (
            <Tooltip data-html="true" id="previewTooltip">
                Cliquez pour pré-visualiser les documents correspondant à votre requête
            </Tooltip>
        );

        const disabledDownloadTooltip = (
            <Tooltip data-html="true" id="disabledDownloadTooltip">
                Pour télécharger indiquez une requête qui renvoie
                au moins un document et cochez au moins un format de fichier
            </Tooltip>
        );
        const popoverRequestLimitWarning = (
            <Popover
                id="popover-request-limit-warning"
                html="true"
                title={<span>Attention{closingButton}</span>}
                trigger="click"
            >
                Reformulez votre requête ou vous ne pourrez télécharger que les&nbsp;
                {commaNumber.bindWith('\xa0', '')(this.state.size)} premiers
                documents,classés par ordre de pertinence, (sur les&nbsp;
                {commaNumber.bindWith('\xa0', '')(this.state.total)} résultats potentiels)
            </Popover>
        );

        const popoverRequestLimitHelp = (
            <Popover
                id="popover-request-limit-help"
                title={<span> Limite temporaire {closingButton}</span>}
            >
                Aujourd’hui, il n’est pas possible de télécharger plus de&nbsp;
                {commaNumber.bindWith('\xa0', '')(this.state.limitNbDoc)} documents.
                L’<a href="mailto:contact@listes.istex.fr">équipe ISTEX</a> travaille à augmenter cette limite.
            </Popover>
        );
        const enrichmentsDisabledTooltip = (
            <Tooltip data-html="true" id="enrichmentsDisabledTooltip">
                Les différents enrichissements proposés dans ISTEX seront prochainement téléchargeables
            </Tooltip>
        );

        const coversTooltip = (
            <Tooltip data-html="true" id="coversTooltip">
                Documents textuels, images, etc.
            </Tooltip>
        );

        const emptyTooltip = (
            <Tooltip id="empty-tooltip" style={{ display: 'none' }} />
        );

        const appendicesTooltip = (
            <Tooltip data-html="true" id="appendicesTooltip">
                Documents textuels, images, vidéos, etc.
            </Tooltip>
        );

    const nouveauTooltip = (
            <Tooltip data-html="true" id="appendicesTooltip">
                Documents textuels, images, vidéos, etc.
            </Tooltip>
        );

        this.updateUrlAndLocalStorage();
        const urlToShare = `https://dl.istex.fr/${document.location.href.slice(document.location.href.indexOf('?'))}`;
        return (
            <div className={`container-fluid ${this.props.className}`}>
                <NotificationContainer />
                <form onSubmit={this.handleSubmit}>

                    <div className="istex-dl-request row">

                        <div className="col-lg-1" />
                        <div className="col-lg-7">
                            <h2>
                                Requête
                                &nbsp;
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    placement="top"
                                    overlay={popoverRequestHelp}
                                >
                                    <i role="button" className="fa fa-info-circle" aria-hidden="true" />
                                </OverlayTrigger>
                                    &nbsp;
                            </h2>
                            <p>Formulez ci-dessous l’équation qui décrit le corpus souhaité :</p>
                            <div className="form-group">
                                <FormGroup
                                    controlId="formBasicText"
                                    validationState={this.characterNumberValidation()}
                                >
                                    <Nav
                                        justified
                                        bsStyle="tabs"
                                        activeKey={this.state.activeKey}
                                        onSelect={k => this.handleSelectNav(k)}
                                    >
                                        <NavItem eventKey="1">
                                            Recherche classique
                                            &nbsp;
                                            <OverlayTrigger
                                                trigger="click"
                                                rootClose
                                                placement="top"
                                                overlay={popoverRequestClassic}
                                            >
                                                <i role="button" className="fa fa-info-circle" aria-hidden="true" />
                                            </OverlayTrigger>
                                        </NavItem>
                                        <NavItem eventKey="2">
                                            Recherche par ARK
                                            &nbsp;
                                            <OverlayTrigger
                                                trigger="click"
                                                rootClose
                                                placement="top"
                                                overlay={popoverRequestARK}
                                            >
                                                <i role="button" className="fa fa-info-circle" aria-hidden="true" />
                                            </OverlayTrigger>
                                        </NavItem>
                                    </Nav>
                                    <Textarea
                                        className="form-control"
                                        placeholder={this.state.activeKey === '1'
                                                        ? 'brain AND language:fre'
                                                        : 'ark:/67375/0T8-JMF4G14B-2\nark:/67375/0T8-RNCBH0VZ-8'
                                                    }
                                        name="q"
                                        id={`area-${this.state.activeKey}`}
                                        rows="3"
                                        autoFocus="true"
                                        value={this.state.activeKey === '1'
                                                        ? this.state.q
                                                        : this.state.querywithIDorARK
                                                    }
                                        onChange={this.handleQueryChange}
                                    />

                                    <HelpBlock>Nombre de caractères restants&nbsp;: {
                                        commaNumber.bindWith('\xa0', '')(characterLimit - this.state.q.length)
                                    }
                                        <FormControl.Feedback
                                            style={{
                                                position: 'relative',
                                                display: 'inline-block',
                                                verticalAlign: 'middle',
                                                marginLeft: '8px',
                                            }}
                                        />
                                    </HelpBlock>

                                </FormGroup>
                            </div>

                            {this.state.total > 0 && (this.state.q !== '' || this.state.querywithIDorARK !== '') &&
                                <p>
                                    L’équation saisie correspond à
                                    &nbsp;
                                    <OverlayTrigger placement="bottom" overlay={previewTooltip}>
                                        <a>
                                            {this.state.total ?
                                             commaNumber.bindWith('\xa0', '')(this.state.total)
                                            .concat(' documents')
                                            : ''}
                                        </a>
                                    </OverlayTrigger>
                                    &nbsp;
                                    {this.state.total > this.state.limitNbDoc &&
                                    <OverlayTrigger
                                        trigger="click"
                                        rootClose
                                        placement="right"
                                        overlay={popoverRequestLimitWarning}

                                    >
                                        <i
                                            role="button"
                                            className="fa fa-exclamation-triangle"
                                            aria-hidden="true"
                                            style={{ color: 'red', marginLeft: '8px' }}
                                        />
                                    </OverlayTrigger>
                                    }
                                </p>
                            }

                            <div className="form-group">
                                Limite du nombre de documents souhaités
                                &nbsp;
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    placement="right"
                                    overlay={popoverRequestLimitHelp}
                                >
                                    <i
                                        id="requestLimitInfo"
                                        role="button"
                                        className="fa fa-info-circle"
                                        aria-hidden="true"
                                    />
                                </OverlayTrigger>
                                &nbsp;
                                :
                                &nbsp;&nbsp;
                                <div style={{ width: '100px', display: 'inline-block' }}>
                                    <NumericInput
                                        className="form-control"
                                        min={0} max={this.state.limitNbDoc} value={this.state.size}
                                        onKeyPress={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                        onChange={size => this.setState({ size })}
                                    />
                                </div>
                                &nbsp;&nbsp;&nbsp;
                                <div style={{ width: '200px', display: 'inline-block' }}>
                                    <InputRange
                                        id="nb-doc-to-download"
                                        maxValue={this.state.limitNbDoc}
                                        minValue={0}
                                        value={Number(this.state.size)}
                                        onChange={size => this.setState({ size })}
                                    />
                                </div>
                            </div>
                            <div className="rankBy">
                                Choisir les documents :
                            </div>
                            <div className="radioGroupRankBy">
                                <Radio
                                    id="radioRelevance"
                                    inline
                                    name="relevance"
                                    checked={this.state.rankBy === 'relevance'}
                                    onChange={this.handlerankByChange}
                                >
                                    Par pertinence
                                </Radio>
                                <Radio
                                    id="radioRandom"
                                    inline
                                    name="random"
                                    checked={this.state.rankBy === 'random'}
                                    onChange={this.handlerankByChange}
                                >
                                    Aléatoirement
                                </Radio>
                            </div>
                        </div>
                        <div className="column-buttons">
                            <div className="vl" />
                            <OverlayTrigger
                                rootClose
                                placement="right"
                                overlay={examplesTooltip}
                                onClick={() => this.setState({ showModalExemple: true })}
                            >
                                <i id="exampleButton" role="button" className="fa fa-lightbulb-o" aria-hidden="true" />
                            </OverlayTrigger>
                            <p>Exemples</p>
                            <OverlayTrigger
                                placement="right"
                                overlay={resetTooltip}
                                onClick={() => this.erase()}
                            >
                                <i role="button" className="fa fa-eraser" aria-hidden="true" />
                            </OverlayTrigger>
                            <p>Réinitialiser</p>
                            <OverlayTrigger
                                placement="right"
                                overlay={reloadTooltip}
                                onClick={Form.handleReload}
                            >
                                <i role="button" className="fa fa-repeat" aria-hidden="true" />
                            </OverlayTrigger>
                            <p>Récupérer</p>
                            <OverlayTrigger
                                placement="right"
                                overlay={historyTooltip}
                                onClick={() => {
                                    this.setState({
                                        showHistory: true,
                                    });
                                }}
                            >
                                <i role="button" className="fa fa-history" aria-hidden="true" />
                            </OverlayTrigger>
                            <p>Historique</p>
                            <OverlayTrigger
                                rootClose
                                placement="right"
                                overlay={shareTooltip}
                                onClick={() => {
                                    if (!this.isDownloadDisabled()) {
                                        this.setState({ showModalShare: true });
                                    }
                                }}
                            >
                                <i role="button" className="fa fa-link" aria-hidden="true" />
                            </OverlayTrigger>
                            <p>Partager</p>
                        </div>
                    </div>

                    {this.state.errorRequestSyntax &&
                        <div className="istex-dl-error-request row">
                            <div className="col-lg-1" />
                            <div className="col-lg-7">
                                <p>
                                    Erreur de syntaxe dans votre requête &nbsp;
                                    <OverlayTrigger
                                        trigger="click"
                                        rootClose
                                        placement="top"
                                        overlay={popoverRequestHelp}
                                    >
                                        <i role="button" className="fa fa-info-circle" aria-hidden="true" />
                                    </OverlayTrigger>
                                    <br />
                                </p>
                                <blockquote
                                    className="blockquote-Syntax-error"
                                >
                                    {this.state.errorRequestSyntax}
                                </blockquote>
                            </div>

                            <div className="col-lg-3" />
                        </div>
                    }


                    <div className="istex-dl-format row" >

                        <div className="col-lg-1" />
                        <div className="col-lg-7">
                            <Modal dialogClassName="history-modal" show={this.state.showHistory} onHide={this.close}>
                                <Modal.Header>
                                    <Modal.Title>Historique des requêtes</Modal.Title>
                                </Modal.Header>

                                <Modal.Body>
                                    <StorageHistory
                                        columnNames="#,Date,Requête,Formats,Nb. docs,Tri"
                                    />
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button
                                        onClick={() => {
                                            this.setState({
                                                showHistory: false,
                                            });
                                        }}
                                    >
                                        Fermer
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                            <h2>
                                Formats et types de fichiers
                                  &nbsp;
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    placement="top"
                                    overlay={popoverFiletypeHelp}
                                >
                                    <i role="button" className="fa fa-info-circle" aria-hidden="true" />
                                </OverlayTrigger>
                            </h2>
                            <p>Créez votre sélection en cochant ou décochant les cases ci-dessous :</p>


                            <span className="fulltextGroup">
                                <Filetype
                                    ref={(instance) => { this.child[1] = instance; }}
                                    label="Texte intégral"
                                    filetype="fulltext"
                                    formats="pdf,tei,txt,ocr,zip,tiff"
                                    labels="PDF|TEI|TXT|OCR|ZIP|TIFF"
                                    value={this.state.extractFulltext}
                                    checkedFormats={this.state.Fulltext}
                                    onChange={this.handleFiletypeChange}
                                    onFormatChange={this.handleFormatChange}
                                />
                            </span>
                            <span className="otherfileGroup">
                                <Filetype
                                    ref={(instance) => { this.child[0] = instance; }}
                                    label="Métadonnées"
                                    filetype="metadata"
                                    formats="xml,mods"
                                    labels="XML|MODS"
                                    value={this.state.extractMetadata}
                                    checkedFormats={this.state.Metadata}
                                    onChange={this.handleFiletypeChange}
                                    onFormatChange={this.handleFormatChange}
                                />
                                <Filetype
                                    ref={(instance) => { this.child[2] = instance; }}
                                    label="Annexes"
                                    filetype="annexes"
                                    formats=""
                                    labels=""
                                    value={this.state.extractAnnexes}
                                    onChange={this.handleFiletypeChange}
                                    onFormatChange={this.handleFormatChange}
                                    tooltip={appendicesTooltip}
                                />
                                <Filetype
                                    ref={(instance) => { this.child[3] = instance; }}
                                    label="Couvertures"
                                    filetype="covers"
                                    formats=""
                                    labels=""
                                    value={this.state.extractCovers}
                                    onChange={this.handleFiletypeChange}
                                    onFormatChange={this.handleFormatChange}
                                    tooltip={coversTooltip}
                                />
                            </span>
                            <span className="enrichmentsGroup">
                                <Filetype
                                    ref={(instance) => { this.child[4] = instance; }}
                                    label="Enrichissements"
                                    filetype="enrichments"
                                    formats="multicat,nb,refbibs,teeft,unitex"
                                    labels="multicat|nb|refBibs|teeft|unitex"
                                    value={this.state.extractEnrichments}
                                    onChange={this.handleFiletypeChange}
                                    onFormatChange={this.handleFormatChange}
                                    disabled
                                    withPopover
                                    tooltip={enrichmentsDisabledTooltip}
                                />
                            </span>

                        </div>
                        <div className="col-lg-3" />
                    </div>

                    <div className="istex-dl-download row">

                        <div className="col-lg-1" />
                        <div className="col-lg-7 text-center">
                            <OverlayTrigger
                                placement="top"
                                overlay={this.isDownloadDisabled() ? disabledDownloadTooltip : emptyTooltip}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-theme btn-lg"
                                    disabled={this.isDownloadDisabled()}
                                >
                                    <i role="button" className="fa fa-download" aria-hidden="true" />
                                        &nbsp;
                                        Télécharger
                                </button>
                            </OverlayTrigger>
                        </div>
                        <div className="col-lg-3" />

                    </div>

                    {this.state.errorDuringDownload &&
                        <div className="istex-dl-error-download row">
                            <div className="col-lg-1" />
                            <div className="col-lg-7">
                                <p>
                                    <i
                                        role="button"
                                        className="fa fa-exclamation-triangle"
                                        aria-hidden="true"
                                    />
                                    &nbsp;
                                    Votre téléchargement s’est interrompu :
                                    <blockquote>
                                        « …message technique de l’API… »
                                    </blockquote>
                                    Veuillez réessayer plus tard ou
                                    <a href="mailto:contact@listes.istex.fr">contactez l’équipe ISTEX</a>
                                </p>
                            </div>
                            <div className="col-lg-3" />
                        </div>
                    }

                </form>
                <Modal show={this.state.downloading} onHide={this.close}>
                    <Modal.Header>
                        <Modal.Title>Téléchargement en cours</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <div className="text-center">
                            La génération de votre corpus est en cours.<br />
                        Veuillez patienter. L’archive sera bientôt téléchargée...
                        <br />
                            <img src="/img/loader.gif" alt="" />
                        </div>

                        <br />
                        Info utilisateurs : Si votre corpus dépasse 4 Go, vous ne pourrez
                        ouvrir l’archive zip sous Windows. Veuillez utiliser par exemple
                        &nbsp;<a href="http://www.7-zip.org/" target="_blank" rel="noopener noreferrer">7zip</a> qui sait
                        gérer les grandes tailles.
                    </Modal.Body>

                    <Modal.Footer>
                        <Modal.Footer>
                            <Button onClick={this.handleCancel}>Fermer</Button>
                        </Modal.Footer>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.showModalShare} onHide={this.close}>
                    <Modal.Header>
                        <Modal.Title>Partager</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <FormGroup>
                            <InputGroup>
                                <FormControl bsSize="small" type="text" readOnly value={urlToShare} />
                                <InputGroup.Button>
                                    <CopyToClipboard
                                        text={urlToShare}
                                        onCopy={Form.handleCopy}
                                    >
                                        <Button
                                            id="copyButton"
                                            onClick={this.hideModalShare}
                                        >
                                            Copier
                                        </Button>
                                    </CopyToClipboard>
                                </InputGroup.Button>
                            </InputGroup>
                        </FormGroup>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button
                            onClick={this.hideModalShare}
                        >
                            Annuler
                        </Button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.showModalExemple} onHide={this.hideModalExemple} backdrop >
                    <Modal.Header>
                        <Modal.Title>Exemples de requêtes</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        Voici quelques exemples dont vous pouvez vous inspirer pour votre recherche.
                        Cliquez sur l&apos;une des loupes et la zone de requête sera remplie automatiquement
                        par le contenu de l&apos;exemple choisi. Cet échantillon illustre différentes façons
                       d&apos;interroger l&apos;API Istex en utilisant...
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.astrophysique)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des données bibliographiques
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.orthophonie)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des mots-clés et des données bibliographiques
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.ecologie)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des données bibliographiques et des indicateurs de qualité
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.motClefsSystematiqueVegetale)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des mots-clés et des opérateurs booléens imbriqués
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.regExpSystematiqueVegetale)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des mots-clés et des expressions régulières
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.regExpArctic)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des mots-clés et des expressions régulières (exemple bis)
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.opArctic)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des mots-clés (avec variantes d’écriture) et plusieurs opérateurs de recherche
                        </div>
                        <div className="exempleRequestLine">
                            <span className="exampleRequest">
                                <OverlayTrigger
                                    rootClose
                                    overlay={tryRequestTooltip}
                                    placement="top"
                                    onClick={() => this.tryExempleRequest(Labelize.vieillissement, true)}
                                >
                                    <i role="button" className="fa fa-search" aria-hidden="true" />
                                </OverlayTrigger>
                            </span>
                            des identifiants ISTEX de type ARK
                        </div>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button
                            onClick={this.hideModalExemple}
                        >
                            Annuler
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

Form.defaultProps = {
    className: '',
};
Form.propTypes = {
    className: PropTypes.string,
};
