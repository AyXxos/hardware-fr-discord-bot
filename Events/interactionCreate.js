const Discord = require("discord.js");

module.exports = async (bot, interaction) => {
    if (interaction.isAutocomplete()) {
        let entry = interaction.options.getFocused();
        let countries = require("../data/countries.json"); 
        
        if (interaction.commandName === "zavvi") {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === "pays") {
                let countryChoices = countries.filter(country => country.name.toLowerCase().includes(entry.toLowerCase())).slice(0, 25);
                await interaction.respond(countryChoices.map(country => ({ name: country.name, value: country.value })));
            }
        }
    }

    if (interaction.isCommand()) { 
        let command = require(`../Commandes/${interaction.commandName}`);
        command.run(bot, interaction, interaction.options);
    }
};
