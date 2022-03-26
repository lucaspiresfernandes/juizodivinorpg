drop database juizodivinodb;

create database juizodivinodb;

use juizodivinodb;

CREATE TABLE `characteristic` (
    `characteristic_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `rollable` BOOLEAN NOT NULL,
    PRIMARY KEY (`characteristic_id`)
);

INSERT INTO
    `characteristic` (`name`, `rollable`)
VALUES
    ('Força', TRUE),
    ('Agilidade', TRUE),
    ('Constituição', TRUE),
    ('Intelecto', TRUE),
    ('Presença', TRUE),
    ('Sabedoria', TRUE),
    ('Tamanho', TRUE),
    ('Deslocamento', FALSE);

CREATE TABLE `curse` (
    `curse_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` MEDIUMTEXT NOT NULL,
    `level` INT UNSIGNED NOT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(`curse_id`)
);

CREATE TABLE `curse_characteristic` (
    `characteristic_id` INT UNSIGNED NOT NULL,
    CONSTRAINT `fk_curse_characteristic_characteristic_id` FOREIGN KEY (`characteristic_id`) REFERENCES `characteristic`(`characteristic_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `curse_characteristic` (`characteristic_id`)
VALUES
    (1),
    (2),
    (3),
    (4),
    (5);

CREATE TABLE `curse_focus` (
    `curse_id` INT UNSIGNED NOT NULL,
    `characteristic_id` INT UNSIGNED NOT NULL,
    `description` MEDIUMTEXT NOT NULL,
    PRIMARY KEY(`curse_id`, `characteristic_id`),
    CONSTRAINT `fk_curse_focus_curse_id` FOREIGN KEY (`curse_id`) REFERENCES `curse`(`curse_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_curse_focus_characteristic_id` FOREIGN KEY (`characteristic_id`) REFERENCES `characteristic`(`characteristic_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `specialization` (
    `specialization_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`specialization_id`)
);

INSERT INTO
    `specialization` (`name`)
VALUES
    ('Atletismo'),
    ('Luta'),
    ('Furtividade'),
    ('Pilotagem'),
    ('Pontaria'),
    ('Prestidigitação'),
    ('Reflexos'),
    ('Fortitude'),
    ('Avaliação'),
    ('Ciência'),
    ('Cultura'),
    ('Investigação'),
    ('Medicina'),
    ('Misticismo'),
    ('Percepção'),
    ('Profissão'),
    ('Afinidade Natural'),
    ('Diplomacia'),
    ('Enganação'),
    ('Intimidação'),
    ('Intuição'),
    ('Vontade');

CREATE TABLE `skill` (
    `skill_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `specialization_id` INT UNSIGNED NULL,
    `characteristic_id` INT UNSIGNED NOT NULL,
    `mandatory` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`skill_id`),
    CONSTRAINT `fk_skill_characteristic_id` FOREIGN KEY (`characteristic_id`) REFERENCES `characteristic`(`characteristic_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_skill_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specialization`(`specialization_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `skill` (
        `specialization_id`,
        `characteristic_id`,
        `name`,
        `mandatory`
    )
VALUES
    (NULL, 1, 'Atletismo', TRUE),
    (NULL, 1, 'Luta', TRUE),
    (NULL, 2, 'Furtividade', TRUE),
    (NULL, 2, 'Pilotagem', TRUE),
    (NULL, 2, 'Pontaria', TRUE),
    (NULL, 2, 'Prestidigitação', TRUE),
    (NULL, 2, 'Reflexos', TRUE),
    (NULL, 3, 'Fortitude', TRUE),
    (NULL, 4, 'Avaliação', TRUE),
    (NULL, 4, 'Ciência', TRUE),
    (NULL, 4, 'História', TRUE),
    (NULL, 4, 'Investigação', TRUE),
    (NULL, 4, 'Medicina', TRUE),
    (NULL, 4, 'Misticismo', TRUE),
    (NULL, 4, 'Percepção', TRUE),
    (NULL, 4, 'Profissão', TRUE),
    (NULL, 5, 'Afinidade Natural', TRUE),
    (NULL, 5, 'Diplomacia', TRUE),
    (NULL, 5, 'Enganação', TRUE),
    (NULL, 5, 'Intimidação', TRUE),
    (NULL, 5, 'Intuição', TRUE),
    (NULL, 5, 'Vontade', TRUE);

CREATE TABLE `attribute` (
    `attribute_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `rollable` BOOLEAN NOT NULL,
    `bg_color` varchar(6) NOT NULL,
    `fill_color` varchar(6) NOT NULL,
    `characteristic_id` INT UNSIGNED NOT NULL,
    `skill_id` INT UNSIGNED NULL,
    `operation` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`attribute_id`),
    CONSTRAINT `fk_attribute_characteristic_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skill`(`skill_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_attribute_characteristic_characteristic_id` FOREIGN KEY (`characteristic_id`) REFERENCES `characteristic`(`characteristic_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `attribute` (
        `name`,
        `rollable`,
        `bg_color`,
        `fill_color`,
        `characteristic_id`,
        `skill_id`,
        `operation`
    )
VALUES
    (
        'Vida',
        FALSE,
        '5a1e1e',
        'b62323',
        7,
        8,
        '({characteristic} + {skill}) / 2'
    ),
    (
        'Sanidade',
        TRUE,
        '584377',
        '871eef',
        4,
        22,
        '{characteristic} + ({skill} * 5)'
    ),
    (
        'Energia',
        FALSE,
        '1d9797',
        '00ffff',
        5,
        NULL,
        '{characteristic} * 2'
    );

CREATE TABLE `class` (
    `class_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `attribute_id` INT UNSIGNED NOT NULL,
    `bonus` INT SIGNED NOT NULL,
    `ability_title` VARCHAR(255) NOT NULL,
    `ability_description` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`class_id`),
    CONSTRAINT `fk_class_attribute_id` FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`attribute_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `class` (
        `name`,
        `attribute_id`,
        `bonus`,
        `ability_title`,
        `ability_description`
    )
VALUES
    (
        'Lutador',
        3,
        2,
        'Saque Rápido',
        'Consegue usar sua ação livre para sacar qualquer arma ou objeto.'
    ),
    (
        'Investigador',
        3,
        6,
        'Intuição Investigativa',
        'Pode usar sua perícia de Intuição para decifrar pistas secretas em um local, ou a localização delas.'
    ),
    (
        'Estudioso',
        3,
        12,
        'Analisar Inimigo',
        'Pode gastar sua ação de movimento para usar sua perícia de Intuição e tentar analisar um inimigo para ter pistas sobre algum de seus atributos.'
    ),
    (
        'Atirador',
        3,
        1,
        'Mira Precisa',
        'Gasta sua ação de movimento para Mirar, sem precisar gastar sua ação principal.'
    ),
    (
        'Diplomata',
        3,
        8,
        'Diplomacia Assegurada',
        'Tem a capacidade de ganhar pontos de diplomacia com alguém. Para cada ponto de diplomacia que você tem com um NPC, você ganha um dado de vantagem nas perícias de Diplomacia e Enganação usadas com eles.'
    ),
    (
        'Ardiloso',
        3,
        4,
        'Furtividade das Sombras',
        'Pode gastar sua ação de movimento para tentar ficar furtivo, sem precisar gastar sua ação principal.'
    );

CREATE TABLE `class_skill` (
    `class_id` INT UNSIGNED NOT NULL,
    `skill_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`class_id`, `skill_id`),
    CONSTRAINT `fk_class_skill_class_id` FOREIGN KEY (`class_id`) REFERENCES `class`(`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_class_skill_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skill`(`skill_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `class_skill` (`class_id`, `skill_id`)
VALUES
    (1, 1),
    (1, 2),
    (1, 7),
    (1, 8),
    (1, 20),
    (2, 9),
    (2, 12),
    (2, 15),
    (2, 16),
    (2, 21),
    (3, 10),
    (3, 11),
    (3, 13),
    (3, 14),
    (3, 22),
    (4, 4),
    (4, 5),
    (4, 7),
    (4, 15),
    (4, 16),
    (5, 16),
    (5, 17),
    (5, 18),
    (5, 19),
    (5, 21),
    (6, 2),
    (6, 3),
    (6, 6),
    (6, 7),
    (6, 19);

CREATE TABLE `lineage` (
    `lineage_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    -- Divine lineages are special lineages which ablities can be replaced with another ability from another lineage.
    `divine` BOOLEAN NOT NULL,
    PRIMARY KEY (`lineage_id`)
);

INSERT INTO
    `lineage` (`name`, `divine`)
VALUES
    ('Amarelo', TRUE),
    ('Azul', FALSE),
    ('Verde', FALSE),
    ('Vermelho', FALSE);

CREATE TABLE `lineage_node` (
    `lineage_id` INT UNSIGNED NOT NULL,
    `index` INT UNSIGNED NOT NULL,
    `level` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `cost` DECIMAL (15, 2) NOT NULL,
    PRIMARY KEY (`lineage_id`, `index`),
    CONSTRAINT `fk_lineage_node_lineage_id` FOREIGN KEY (`lineage_id`) REFERENCES `lineage`(`lineage_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `lineage_node` (
        `lineage_id`,
        `index`,
        `level`,
        `name`,
        `description`,
        `cost`,
        `type`
    )
VALUES
    (
        1,
        1,
        1,
        'Amarelinha',
        'Permite voar.',
        0,
        'Passiva'
    ),
    (
        1,
        2,
        2,
        'Amarelo elo',
        'Sim. Elo.',
        1,
        'Passiva'
    ),
    (
        1,
        3,
        3,
        'Relomarelo',
        'Lingua travada?',
        1,
        'Passiva'
    ),
    (
        1,
        4,
        3,
        'lero lero',
        'Ié ié!',
        1,
        'Passiva'
    ),
    (
        1,
        5,
        4,
        'Amarelo',
        'Tá ficando sério.',
        1,
        'Passiva'
    ),
    (
        1,
        6,
        4,
        'Amar. Elo. Amarelo',
        'Poético...',
        1,
        'Passiva'
    ),
    (
        1,
        7,
        4,
        'Amarelado',
        'Adjetivos, muito bom.',
        1,
        'Passiva'
    ),
    (
        1,
        8,
        5,
        'Amarelão',
        'Caralho, um amarelo muito grande.',
        1,
        'Passiva'
    ),
    (
        1,
        9,
        6,
        'Amarelo Deus',
        'Você é o Deus do amarelo',
        1,
        'Passiva'
    ),
    (
        2,
        1,
        1,
        'Azulzinho',
        'Bem piquititinho.',
        0,
        'Passiva'
    ),
    (
        2,
        2,
        2,
        'Azulejo',
        'Do seu banheiro.',
        1,
        'Passiva'
    ),
    (
        2,
        3,
        3,
        'Azulado',
        'Adjetivo de estado. :)',
        1,
        'Passiva'
    ),
    (
        2,
        4,
        3,
        'Azulto',
        'Um adulto azul.',
        1,
        'Passiva'
    ),
    (
        2,
        5,
        4,
        'Luza',
        '?meb odut áT',
        1,
        'Passiva'
    ),
    (
        2,
        6,
        4,
        'Azul',
        'Tá ficando sério...',
        1,
        'Passiva'
    ),
    (
        2,
        7,
        4,
        'Baleia Azul',
        'PrOOocuRANDO O NEEEeeeemO',
        1,
        'Passiva'
    ),
    (
        2,
        8,
        5,
        'Azulzão',
        'Caralho, muito azul.',
        1,
        'Passiva'
    ),
    (
        2,
        9,
        6,
        'Azul Deus',
        'Você é o deus do azul.',
        1,
        'Passiva'
    ),
    (
        3,
        1,
        1,
        'Verdinha',
        'Hmm... Sus...',
        0,
        'Passiva'
    ),
    (
        3,
        2,
        2,
        'Verdejante',
        'Sinceramente, eu nem sei exatamente o que isso significa.',
        1,
        'Passiva'
    ),
    (
        3,
        3,
        3,
        'Verdana',
        'Entendeu? rsrsrsrs',
        1,
        'Passiva'
    ),
    (
        3,
        4,
        3,
        'Verdedito',
        'Um veredito verde. Parece ser bom.',
        1,
        'Passiva'
    ),
    (
        3,
        5,
        4,
        'Verde',
        'ok, verde.',
        1,
        'Passiva'
    ),
    (
        3,
        6,
        4,
        'Verdura',
        'Tem que comer!',
        1,
        'Passiva'
    ),
    (
        3,
        7,
        4,
        'Verme- Verde!',
        'ERROU!',
        1,
        'Passiva'
    ),
    (
        3,
        8,
        5,
        'Verdão',
        'Muito verde!',
        1,
        'Passiva'
    ),
    (
        3,
        9,
        6,
        'Deus do verde',
        'Você é o deus do verde',
        1,
        'Passiva'
    ),
    (
        4,
        1,
        1,
        'Vermelhinho',
        'Tá doendo?',
        0,
        'Passiva'
    ),
    (
        4,
        2,
        2,
        'Avermelhado',
        'É como o seu sorriso me deixa... uWu',
        1,
        'Passiva'
    ),
    (
        4,
        3,
        3,
        'Vermédio',
        'Pra quando vc tá mal.',
        1,
        'Passiva'
    ),
    (
        4,
        4,
        3,
        'Verme...lho',
        'Muito nojento!',
        1,
        'Passiva'
    ),
    (
        4,
        5,
        4,
        'Vermelho',
        'OoO',
        1,
        'Passiva'
    ),
    (
        4,
        6,
        4,
        'Vermelha',
        'Tipo... o feminino de vermelho...',
        1,
        'Passiva'
    ),
    (
        4,
        7,
        4,
        'Vermeja',
        'Pra limpar a cozinha.',
        1,
        'Passiva'
    ),
    (
        4,
        8,
        5,
        'Vermelhão',
        'Meu Deus tá doendo muito!',
        1,
        'Passiva'
    ),
    (
        4,
        9,
        6,
        'Deus do Vermelho',
        'Você é o deus do Vermelho',
        1,
        'Passiva'
    );

CREATE TABLE `lineage_node_connection` (
    `lineage_id` INT UNSIGNED NOT NULL,
    `index` INT UNSIGNED NOT NULL,
    `next_index` INT UNSIGNED NOT NULL,
    CONSTRAINT `fk_lineage_node_connection_lineage_id_index` FOREIGN KEY (`lineage_id`, `index`) REFERENCES `lineage_node`(`lineage_id`, `index`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_lineage_node_connection_lineage_id_next_index` FOREIGN KEY (`lineage_id`, `next_index`) REFERENCES `lineage_node`(`lineage_id`, `index`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `lineage_node_connection` (`lineage_id`, `index`, `next_index`)
VALUES
    (1, 1, 2),
    (1, 2, 3),
    (1, 2, 4),
    (1, 2, 6),
    (1, 3, 5),
    (1, 3, 6),
    (1, 4, 6),
    (1, 4, 7),
    (1, 5, 9),
    (1, 6, 8),
    (1, 7, 9),
    (1, 8, 9),
    (2, 1, 2),
    (2, 2, 3),
    (2, 2, 4),
    (2, 2, 6),
    (2, 3, 5),
    (2, 3, 6),
    (2, 4, 6),
    (2, 4, 7),
    (2, 5, 9),
    (2, 6, 8),
    (2, 7, 9),
    (2, 8, 9),
    (3, 1, 2),
    (3, 2, 3),
    (3, 2, 4),
    (3, 2, 6),
    (3, 3, 5),
    (3, 3, 6),
    (3, 4, 6),
    (3, 4, 7),
    (3, 5, 9),
    (3, 6, 8),
    (3, 7, 9),
    (3, 8, 9),
    (4, 1, 2),
    (4, 2, 3),
    (4, 2, 4),
    (4, 2, 6),
    (4, 3, 5),
    (4, 3, 6),
    (4, 4, 6),
    (4, 4, 7),
    (4, 5, 9),
    (4, 6, 8),
    (4, 7, 9),
    (4, 8, 9);

CREATE TABLE `player` (
    `player_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `admin` BOOLEAN NOT NULL,
    `class_id` INT UNSIGNED NULL DEFAULT NULL,
    `lineage_id` INT UNSIGNED NULL DEFAULT NULL,
    `score` DECIMAL (15, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (`player_id`),
    CONSTRAINT `fk_player_class_id` FOREIGN KEY (`class_id`) REFERENCES `class`(`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_lineage_id` FOREIGN KEY (`lineage_id`) REFERENCES `lineage`(`lineage_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_lineage_node` (
    `player_id` INT UNSIGNED NOT NULL,
    `lineage_id` INT UNSIGNED NOT NULL,
    `index` INT UNSIGNED NOT NULL,
    `date_conquered` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`player_id`, `index`),
    CONSTRAINT `fk_player_lineage_node_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_lineage_node_lineage_id_index` FOREIGN KEY (`lineage_id`, `index`) REFERENCES `lineage_node`(`lineage_id`, `index`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_characteristic` (
    `player_id` INT UNSIGNED NOT NULL,
    `characteristic_id` INT UNSIGNED NOT NULL,
    `value` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`player_id`, `characteristic_id`),
    CONSTRAINT `uk_player_id_characteristic_id` UNIQUE (`player_id`, `characteristic_id`),
    CONSTRAINT `fk_player_characteristic_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_characteristic_characteristic_id` FOREIGN KEY (`characteristic_id`) REFERENCES `characteristic`(`characteristic_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_curse` (
    `player_id` INT UNSIGNED NOT NULL,
    `curse_id` INT UNSIGNED NOT NULL,
    `characteristic_id` INT UNSIGNED NULL,
    `date_acquired` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`player_id`, `curse_id`),
    CONSTRAINT `fk_player_curse_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_curse_curse_id` FOREIGN KEY (`curse_id`) REFERENCES `curse`(`curse_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_curse_characteristic_id` FOREIGN KEY (`characteristic_id`) REFERENCES `curse_characteristic`(`characteristic_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_skill` (
    `player_id` INT UNSIGNED NOT NULL,
    `skill_id` INT UNSIGNED NOT NULL,
    `value` INT UNSIGNED NOT NULL,
    `extra_value` INT UNSIGNED NOT NULL,
    `total_value` INT UNSIGNED GENERATED ALWAYS AS (`value` + `extra_value`) STORED,
    PRIMARY KEY (`player_id`, `skill_id`),
    CONSTRAINT `uk_player_id_skill_id` UNIQUE (`player_id`, `skill_id`),
    CONSTRAINT `fk_player_skill_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_skill_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skill`(`skill_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `attribute_status` (
    `attribute_status_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `attribute_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`attribute_status_id`),
    CONSTRAINT `fk_attribute_status_attribute_id` FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`attribute_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `attribute_status` (`name`, `attribute_id`)
VALUES
    ('Morrendo', 1),
    ('Enfraquecendo', 1),
    ('Inconsciente', 1),
    ('Lesão Grave', 1),
    ('Traumatizado', 2),
    ('Acessório', 3);

CREATE TABLE `player_attribute` (
    `player_id` INT UNSIGNED NOT NULL,
    `attribute_id` INT UNSIGNED NOT NULL,
    `value` INT UNSIGNED NOT NULL,
    `max_value` INT UNSIGNED NOT NULL,
    `extra_value` INT UNSIGNED NOT NULL,
    `total_value` INT UNSIGNED GENERATED ALWAYS AS (`max_value` + `extra_value`) STORED,
    `coefficient` DECIMAL(15, 2) GENERATED ALWAYS AS (IFNULL((`value` / `total_value`) * 100, 0)) VIRTUAL,
    PRIMARY KEY (`player_id`, `attribute_id`),
    CONSTRAINT `uk_player_id_attribute_id` UNIQUE (`player_id`, `attribute_id`),
    CONSTRAINT `fk_player_attribute_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_attribute_attribute_id` FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`attribute_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_attribute_status` (
    `player_id` INT UNSIGNED NOT NULL,
    `attribute_status_id` INT UNSIGNED NOT NULL,
    `value` BOOLEAN NOT NULL,
    PRIMARY KEY (`player_id`, `attribute_status_id`),
    CONSTRAINT `uk_player_id_attribute_status_id` UNIQUE (`player_id`, `attribute_status_id`),
    CONSTRAINT `fk_player_attribute_status_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_attribute_status_attribute_status_id` FOREIGN KEY (`attribute_status_id`) REFERENCES `attribute_status`(`attribute_status_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `equipment` (
    `equipment_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `skill_id` INT UNSIGNED NOT NULL,
    `damage` VARCHAR(255) NOT NULL,
    `range` VARCHAR(255) NOT NULL,
    `attacks` VARCHAR(255) NOT NULL,
    `ammo` VARCHAR(255) NOT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`equipment_id`),
    CONSTRAINT `fk_equipment_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`skill_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    `equipment` (
        `name`,
        `type`,
        `skill_id`,
        `damage`,
        `range`,
        `attacks`,
        `ammo`,
        `visible`
    )
VALUES
    (
        'Desarmado',
        'Luta',
        2,
        '1d3',
        'Toque',
        '1',
        '-',
        TRUE
    );

CREATE TABLE `player_equipment` (
    `player_id` INT UNSIGNED NOT NULL,
    `equipment_id` INT UNSIGNED NOT NULL,
    `current_ammo` varchar(255) NOT NULL,
    `using` BOOLEAN NOT NULL,
    PRIMARY KEY (`player_id`, `equipment_id`),
    CONSTRAINT `uk_player_id_equipment_id` UNIQUE (`player_id`, `equipment_id`),
    CONSTRAINT `fk_player_equipment_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_equipment_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `spec` (
    `spec_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`spec_id`)
);

INSERT INTO
    `spec` (`name`)
VALUES
    ('Exposição Pavorosa');

CREATE TABLE `player_spec` (
    `player_id` INT UNSIGNED NOT NULL,
    `spec_id` INT UNSIGNED NOT NULL,
    `value` varchar(255) NOT NULL,
    PRIMARY KEY (`player_id`, `spec_id`),
    CONSTRAINT `uk_player_id_spec_id` UNIQUE (`player_id`, `spec_id`),
    CONSTRAINT `fk_player_spec_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_spec_spec_id` FOREIGN KEY (`spec_id`) REFERENCES `spec`(`spec_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `item` (
    `item_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `description` MEDIUMTEXT NOT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`item_id`)
);

CREATE TABLE `player_item` (
    `player_id` INT UNSIGNED NOT NULL,
    `item_id` INT UNSIGNED NOT NULL,
    `description` MEDIUMTEXT NOT NULL,
    `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (`player_id`, `item_id`),
    CONSTRAINT `uk_player_id_item_id` UNIQUE (`player_id`, `item_id`),
    CONSTRAINT `fk_player_item_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_item_item_id` FOREIGN KEY (`item_id`) REFERENCES `item`(`item_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `info` (
    `info_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`info_id`)
);

INSERT INTO
    `info` (`name`)
VALUES
    ('Nome'),
    ('Player'),
    ('Idade'),
    ('Raça'),
    ('Local de Nascimento'),
    ('Altura');

CREATE TABLE `player_info` (
    `player_id` INT UNSIGNED NOT NULL,
    `info_id` INT UNSIGNED NOT NULL,
    `value` MEDIUMTEXT NOT NULL,
    PRIMARY KEY (`player_id`, `info_id`),
    CONSTRAINT `uk_player_id_info_id` UNIQUE (`player_id`, `info_id`),
    CONSTRAINT `fk_player_info_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_info_info_id` FOREIGN KEY (`info_id`) REFERENCES `info`(`info_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `extra_info` (
    `extra_info_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`extra_info_id`)
);

INSERT INTO
    `extra_info` (`name`)
VALUES
    ('História'),
    ('Itens, Pessoas e Locais Importantes'),
    ('Fobias e Manias');

CREATE TABLE `player_extra_info` (
    `player_id` INT UNSIGNED NOT NULL,
    `extra_info_id` INT UNSIGNED NOT NULL,
    `value` MEDIUMTEXT NOT NULL,
    PRIMARY KEY (`player_id`, `extra_info_id`),
    CONSTRAINT `uk_player_id_extra_info_id` UNIQUE (`player_id`, `extra_info_id`),
    CONSTRAINT `fk_player_extra_info_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_extra_info_extra_info_id` FOREIGN KEY (`extra_info_id`) REFERENCES `extra_info`(`extra_info_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_avatar` (
    `player_id` INT UNSIGNED NOT NULL,
    `attribute_status_id` INT UNSIGNED NULL,
    `link` MEDIUMTEXT NULL DEFAULT NULL,
    UNIQUE KEY (`player_id`, `attribute_status_id`),
    CONSTRAINT `uk_player_id_attribute_status_id` UNIQUE (`player_id`, `attribute_status_id`),
    CONSTRAINT `fk_player_avatar_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_player_avatar_attribute_status_id` FOREIGN KEY (`attribute_status_id`) REFERENCES `attribute_status`(`attribute_status_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_note` (
    `player_id` INT UNSIGNED NOT NULL,
    `value` MEDIUMTEXT NOT NULL,
    PRIMARY KEY (`player_id`),
    CONSTRAINT `fk_player_note_player_id` FOREIGN KEY (`player_id`) REFERENCES `player`(`player_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `player_session` (
    `sid` VARCHAR(255),
    `sess` JSON NOT NULL,
    `expired` DATETIME NOT NULL,
    PRIMARY KEY (`sid`),
    INDEX `player_session_expired_index` (`expired`)
);

CREATE TABLE `config` (
    `key` VARCHAR(255) NOT NULL,
    `value` VARCHAR(255) NULL,
    PRIMARY KEY (`key`)
);

INSERT INTO
    `config` (`key`, `value`)
VALUES
    ('portrait_environment', 'idle');